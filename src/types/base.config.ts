import type { Transport } from "@nestjs/microservices/enums/transport.enum";

// Базовый интерфейс для конфигурации RabbitMQ
export default interface RabbitMQConfigBase {
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
}
