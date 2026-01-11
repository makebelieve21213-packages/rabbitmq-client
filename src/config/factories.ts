import { Transport } from "@nestjs/microservices/enums/transport.enum";

import type RabbitMQConfigDLX from "src/types/rabbitmq-config-dlx";
import type RabbitMQConfigReciever from "src/types/rabbitmq-config-receiver";
import type RabbitMQConfigRetry from "src/types/rabbitmq-config-retry";
import type RabbitMQConfigSender from "src/types/rabbitmq-config-sender";
import type RabbitMQReceiverOptions from "src/types/rabbitmq-receiver-options";
import type RabbitMQSenderOptions from "src/types/rabbitmq-sender-options";

// Создает конфигурацию sender с routingKeys
export function createSenderConfig(options: RabbitMQSenderOptions): RabbitMQConfigSender {
	// Проверяем, что routingKeys переданы в конфигурации
	if (!options.routingKeys || typeof options.routingKeys !== "object") {
		throw new Error("routingKeys is required in RabbitMQ sender configuration");
	}

	return {
		transport: Transport.RMQ,
		options: {
			urls: [options.url],
			exchange: options.exchange,
			exchangeType: options.exchangeType,
			wildcards: true,
			durable: true,
			replyQueueOptions: {
				durable: options.replyQueueOptions?.durable ?? false,
				autoDelete: options.replyQueueOptions?.autoDelete ?? true,
			},
		},
		routingKeys: options.routingKeys,
	};
}

/**
 * Создает конфигурацию receiver с DLX настройками
 * Использует единую глобальную DLX очередь для всех очередей
 */
export function createReceiverConfig(
	options: RabbitMQReceiverOptions,
	pattern?: string
): RabbitMQConfigReciever {
	const receiverPattern = pattern || options.pattern;
	const retryExchange = options.retryExchange || `${options.exchange}.retry`;

	return {
		transport: Transport.RMQ,
		options: {
			urls: [options.url],
			queue: options.queue,
			queueOptions: {
				durable: true,
				arguments: {
					"x-dead-letter-exchange": retryExchange,
					// Используем паттерн для DLX routing key
					"x-dead-letter-routing-key": receiverPattern,
				},
			},
			exchange: options.exchange,
			exchangeType: options.exchangeType,
			wildcards: true,
			pattern: receiverPattern,
			prefetchCount: options.prefetchCount || 10,
			noAck: options.noAck ?? false,
		},
	};
}

/**
 * Создает конфигурацию retry с TTL и DLX настройками
 * Retry очередь возвращает сообщения обратно в основную очередь после TTL
 */
export function createRetryConfig(options: RabbitMQReceiverOptions): RabbitMQConfigRetry {
	const retryQueue = options.retryQueue || `${options.queue}.retry`;
	const retryExchange = options.retryExchange || `${options.exchange}.retry`;
	const retryExchangeType = options.retryExchangeType || options.exchangeType;
	const retryTtl = options.retryTtl || 5000;

	return {
		transport: Transport.RMQ,
		options: {
			urls: [options.url],
			queue: retryQueue,
			queueOptions: {
				durable: true,
				arguments: {
					"x-dead-letter-exchange": options.exchange,
					"x-dead-letter-routing-key": options.pattern,
					"x-message-ttl": retryTtl,
				},
			},
			exchange: retryExchange,
			exchangeType: retryExchangeType,
			wildcards: true,
		},
	};
}

/**
 * Создает конфигурацию единой глобальной DLX очереди для всех очередей
 * Все очереди используют одну и ту же DLX очередь для критических ошибок
 */
export function createDLXConfig(options: RabbitMQReceiverOptions): RabbitMQConfigDLX {
	// Используем единую глобальную DLX очередь для всех очередей
	const dlxQueue = options.dlxQueue || "global.dlx";
	const dlxExchange = options.dlxExchange || "events_exchange.dlx";
	const dlxExchangeType = options.dlxExchangeType || options.exchangeType;

	return {
		transport: Transport.RMQ,
		options: {
			urls: [options.url],
			queue: dlxQueue,
			queueOptions: {
				durable: true,
			},
			exchange: dlxExchange,
			exchangeType: dlxExchangeType,
			wildcards: true,
		},
	};
}
