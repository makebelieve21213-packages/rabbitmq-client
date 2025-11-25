import { LoggerService } from "@makebelieve21213-packages/logger";
import { RedisClientService } from "@makebelieve21213-packages/redis-client";
import { createDLXConfig, createReceiverConfig, createRetryConfig } from "src/config/factories";
import RabbitMQIdempotencyInterceptor from "src/interceptors/rabbitmq.interceptor";

import type { INestApplication } from "@nestjs/common";
import type RabbitMQReceiverOptions from "src/types/rabbitmq-receiver-options";

/**
 * Подключает RabbitMQ‑микросервис на принятие сообщений из указанной очереди
 * Создает receiver, retry и DLX конфигурации для обработки сообщений
 */
export default async function connectRabbitMQReceiver(
	app: INestApplication,
	receiverOptions: RabbitMQReceiverOptions,
	skipGlobalSetup = false
): Promise<void> {
	const logger = await app.resolve(LoggerService);
	const redisService = await app.resolve(RedisClientService);

	// Вычисляем конфигурации для receiver, retry и DLX
	const rmqReceiverConfig = createReceiverConfig(receiverOptions);
	const rmqRetryConfig = createRetryConfig(receiverOptions);
	const rmqDLXConfig = createDLXConfig(receiverOptions);

	/**
	 * Глобальный Interceptor для проверки идемпотентности сообщений
	 * Проверяет дубликаты через Redis по уникальному ID сообщения
	 */
	if (!skipGlobalSetup) {
		app.useGlobalInterceptors(new RabbitMQIdempotencyInterceptor(redisService, logger));
	}

	// Подключаем RabbitMQ‑микросервис на принятие сообщений из основной очереди
	app.connectMicroservice({
		transport: rmqReceiverConfig.transport,
		options: rmqReceiverConfig.options,
	});

	// Подключаем retry очередь для повторной обработки сообщений
	app.connectMicroservice({
		transport: rmqRetryConfig.transport,
		options: rmqRetryConfig.options,
	});

	// Подключаем единую DLX очередь для критических ошибок (создается только один раз)
	if (!skipGlobalSetup) {
		const existingMicroservices = app.getMicroservices();
		const dlxAlreadyConnected = existingMicroservices.some((ms) => {
			const options = (ms as { options?: { queue?: string } }).options;
			return options?.queue === rmqDLXConfig.options.queue;
		});

		if (!dlxAlreadyConnected) {
			app.connectMicroservice({
				transport: rmqDLXConfig.transport,
				options: rmqDLXConfig.options,
			});
		}
	}

	logger.log(
		`RabbitMQ receiver connected [queue: ${receiverOptions.queue}, pattern: ${receiverOptions.pattern}, exchange: ${receiverOptions.exchange}, exchangeType: ${receiverOptions.exchangeType}]`
	);
}
