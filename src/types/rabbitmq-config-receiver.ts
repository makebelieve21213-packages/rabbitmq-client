import type RabbitMQConfigBase from "src/types/base.config";

// Тип конфигурации для receiver RabbitMQ
export default interface RabbitMQConfigReciever extends RabbitMQConfigBase {
	options: RabbitMQConfigBase["options"] & {
		queueOptions: {
			arguments: {
				"x-dead-letter-exchange": string;
				"x-dead-letter-routing-key": string;
			};
		} & RabbitMQConfigBase["options"]["queueOptions"];
		pattern: string;
		prefetchCount: number;
		noAck: boolean;
	};
}
