import type RabbitMQConfigBase from "src/types/base.config";

// Тип конфигурации для retry RabbitMQ
export default interface RabbitMQConfigRetry extends RabbitMQConfigBase {
	options: RabbitMQConfigBase["options"] & {
		queueOptions: {
			arguments: {
				"x-dead-letter-exchange": string;
				"x-dead-letter-routing-key": string;
				"x-message-ttl": number;
			};
		} & RabbitMQConfigBase["options"]["queueOptions"];
	};
}
