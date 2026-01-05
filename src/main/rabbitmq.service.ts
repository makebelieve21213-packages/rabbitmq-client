import { LoggerService } from "@makebelieve21213-packages/logger";
import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClientProxy, RmqRecordBuilder } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";
import { createSenderConfig } from "src/config/factories";
import { ROUTING_KEYS } from "src/types/routing-keys";
import { RABBITMQ_SENDER_SERVICE } from "src/utils/injections";
import { v4 as uuidv4 } from "uuid";

import type { RmqRecordOptions } from "@nestjs/microservices";
import type { MessageWithCorrelationId } from "src/types/message-with-correlation-id";
import type RabbitMQSenderOptions from "src/types/rabbitmq-sender-options";

// Сервис по отправке сообщений через RabbitMQ на другие сервисы
@Injectable()
export default class RabbitMQService implements OnModuleInit, OnModuleDestroy {
	private readonly rk: Record<ROUTING_KEYS, ROUTING_KEYS>;

	constructor(
		@Inject(RABBITMQ_SENDER_SERVICE)
		private readonly client: ClientProxy,
		private readonly configService: ConfigService,
		private readonly logger: LoggerService
	) {
		this.logger.setContext(RabbitMQService.name);

		// Всегда вычисляем конфигурацию динамически из senderOptions
		// Это гарантирует наличие routingKeys без необходимости регистрации в ConfigService
		const senderOptions = this.configService.get<RabbitMQSenderOptions>("rabbitmqSender");
		if (!senderOptions) {
			throw new Error("RabbitMQ sender options not found in configuration");
		}

		const rmq = createSenderConfig(senderOptions);

		this.rk = rmq.routingKeys;

		this.logger.log(`RabbitMQ routing keys initialized: ${Object.keys(this.rk).length} keys`);
	}

	async onModuleInit() {
		await this.client.connect();
		this.logger.log("RabbitMQ connected");
	}

	async onModuleDestroy() {
		await this.client.close();
		this.logger.log("RabbitMQ disconnected");
	}

	// Добавляет correlationId и correlationTimestamp в сообщение для идемпотентности
	private addCorrelationId<I>(data: I): I & MessageWithCorrelationId {
		if (data === null || typeof data !== "object") {
			// Если данные не объект, оборачиваем в объект
			return {
				data,
				correlationId: uuidv4(),
				correlationTimestamp: Date.now(),
			} as unknown as I & MessageWithCorrelationId;
		}

		return {
			...(data as Record<string, unknown>),
			correlationId: uuidv4(),
			correlationTimestamp: Date.now(),
		} as unknown as I & MessageWithCorrelationId;
	}

	/**
	 * Отправляем сообщение по указанному routingKey используя fire-and-forget паттерн
	 * Для fire-and-forget не добавляем correlationId, так как идемпотентность не требуется
	 */
	fireAndForget<I>(key: ROUTING_KEYS, data: I): void {
		this.logger.log(`fireAndForget [routingKey=${this.rk[key]}, data=${JSON.stringify(data)}]`);

		// Подписываемся на Observable для гарантии отправки и обработки ошибок
		this.client.emit(this.rk[key], data).subscribe({
			error: (error: Error | unknown) => {
				this.logger.error(
					`Ошибка отправки fire-and-forget сообщения [routingKey=${this.rk[key]}]: ${error}`
				);
			},
		});
	}

	/**
	 * Отправляем сообщение по указанному routingKey и ждем ответ от получателя (request-response паттерн)
	 * Добавляем correlationId и correlationTimestamp для идемпотентности
	 * Поддерживает передачу заголовков и других опций через параметр options
	 */
	async publish<I, O>(key: ROUTING_KEYS, data: I, options?: RmqRecordOptions): Promise<O> {
		const messageWithCorrelation = this.addCorrelationId(data);
		const routingKey = this.rk[key];

		this.logger.log(
			`publish [routingKey=${routingKey}, correlationId=${messageWithCorrelation.correlationId}, data=${JSON.stringify(data)}]`
		);

		let message: (I & MessageWithCorrelationId) | ReturnType<typeof RmqRecordBuilder.prototype.build>;

		if (options) {
			// Используем RmqRecordBuilder для создания записи с заголовками
			const record = new RmqRecordBuilder(messageWithCorrelation).setOptions(options).build();
			message = record;
		} else {
			// Используем простой dto без заголовков (обратная совместимость)
			message = messageWithCorrelation;
		}

		const result = this.client.send<O>(routingKey, message);

		return (await lastValueFrom(result)) as O;
	}
}
