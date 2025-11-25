// Упрощенные тестовые типы для интерфейсов RabbitMQ
import type { Transport } from "@nestjs/microservices/enums/transport.enum";

export type TestRabbitMQConfigReciever = {
	transport: Transport.RMQ;
	options: {
		urls: string[];
		queue: string;
		queueOptions: {
			durable: boolean;
			arguments: {
				"x-dead-letter-exchange": string;
				"x-dead-letter-routing-key": string;
			};
		};
		exchange: string;
		exchangeType: string;
		wildcards: boolean;
		prefetchCount: number;
		noAck: boolean;
	};
};

export type TestRabbitMQConfigRetry = {
	transport: Transport.RMQ;
	options: {
		urls: string[];
		queue: string;
		queueOptions: {
			durable: boolean;
			arguments: {
				"x-dead-letter-exchange": string;
				"x-dead-letter-routing-key": string;
				"x-message-ttl": number;
			};
		};
		exchange: string;
		exchangeType: string;
		wildcards: boolean;
	};
};

export type TestRabbitMQConfigDLX = {
	transport: Transport.RMQ;
	options: {
		urls: string[];
		queue: string;
		queueOptions: {
			durable: boolean;
		};
		exchange: string;
		exchangeType: string;
		wildcards: boolean;
	};
};
