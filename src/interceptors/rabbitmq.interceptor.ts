import { LoggerService } from "@makebelieve21213-packages/logger";
import { RedisClientService } from "@makebelieve21213-packages/redis-client";
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, throwError, from } from "rxjs";
import { catchError, switchMap, tap } from "rxjs/operators";

import type { RmqContext } from "@nestjs/microservices";
import type { MessageWithCorrelationId } from "src/types/message-with-correlation-id";

/**
 * Interceptor для проверки идемпотентности сообщений RabbitMQ
 * Отслеживает дубликаты сообщений через Redis по correlationId
 */
@Injectable()
export default class RabbitMQIdempotencyInterceptor implements NestInterceptor {
	private readonly IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 часа в секундах

	constructor(
		private readonly redisService: RedisClientService,
		private readonly logger: LoggerService
	) {
		this.logger.setContext(RabbitMQIdempotencyInterceptor.name);
	}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		// Проверяем, что это RPC контекст (RabbitMQ)
		const contextType = context.getType();

		if (contextType !== "rpc") {
			return next.handle();
		}

		const data = context.getArgByIndex(0);

		// Проверяем, есть ли correlationId в сообщении
		if (!this.hasCorrelationId(data)) {
			// Если correlationId нет, пропускаем проверку идемпотентности
			return next.handle();
		}

		const messageWithCorrelation = data as MessageWithCorrelationId;
		const correlationId = messageWithCorrelation.correlationId;
		const redisKey = `rabbitmq:idempotency:${correlationId}`;

		// Проверяем, было ли сообщение уже обработано
		// Используем get() для проверки существования ключа (null означает отсутствие ключа)
		return from(this.redisService.get(redisKey)).pipe(
			switchMap((value) => {
				if (value !== null) {
					// Сообщение уже обработано - это дубликат
					this.logger.warn(
						`Duplicate message detected and skipped [correlationId=${correlationId}, correlationTimestamp=${messageWithCorrelation.correlationTimestamp}]`
					);
					// Явно подтверждаем сообщение, чтобы оно не осталось unacked
					this.acknowledgeMessage(context);
					// Возвращаем успешный ответ без обработки
					return new Observable((observer) => {
						observer.next({ duplicate: true, correlationId });
						observer.complete();
					});
				}

				// Сообщение новое - помечаем как обрабатываемое и продолжаем
				return from(
					this.redisService.set(
						redisKey,
						String(messageWithCorrelation.correlationTimestamp),
						this.IDEMPOTENCY_TTL
					)
				).pipe(
					switchMap(() => next.handle()),
					tap(() => {
						// Сообщение успешно обработано
						this.logger.log(`Message processed successfully [correlationId=${correlationId}]`);
					}),
					catchError((error: Error | unknown) => {
						// При ошибке удаляем ключ, чтобы можно было повторить обработку
						this.redisService.del(redisKey).catch((delError: Error | unknown) => {
							this.logger.error(
								`Failed to delete idempotency key [correlationId=${correlationId}]: ${delError}`
							);
						});
						return throwError(() => error);
					})
				);
			}),
			catchError((error: Error | unknown) => {
				const errorCorrelationId = (data as MessageWithCorrelationId)?.correlationId || "unknown";
				this.logger.error(
					`Failed to check idempotency [correlationId=${errorCorrelationId}]: ${error}`
				);
				// Продолжаем обработку даже при ошибке Redis
				return next.handle();
			})
		);
	}

	// Проверяет, есть ли correlationId в сообщении
	private hasCorrelationId(data: unknown): data is MessageWithCorrelationId {
		return (
			data !== null &&
			typeof data === "object" &&
			"correlationId" in data &&
			typeof (data as MessageWithCorrelationId).correlationId === "string"
		);
	}

	// Подтверждает сообщение в RabbitMQ при обнаружении дубликата
	private acknowledgeMessage(context: ExecutionContext): void {
		try {
			const rpcContext = context.switchToRpc().getContext<RmqContext>();
			if (
				rpcContext &&
				typeof rpcContext.getChannelRef === "function" &&
				typeof rpcContext.getMessage === "function"
			) {
				const channel = rpcContext.getChannelRef();
				const message = rpcContext.getMessage();
				channel.ack(message);
			}
		} catch (error: Error | unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logger.error(`Failed to acknowledge duplicate message: ${errorMessage}`);
		}
	}
}
