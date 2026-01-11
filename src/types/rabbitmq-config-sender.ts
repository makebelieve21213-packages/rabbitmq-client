import type RabbitMQConfigBase from "src/types/base.config";
import type { RoutingKeys } from "src/types/routing-keys";

// Тип конфигурации для sender RabbitMQ
export default interface RabbitMQConfigSender extends Omit<RabbitMQConfigBase, "options"> {
	options: Omit<RabbitMQConfigBase["options"], "queue" | "queueOptions"> & {
		durable: boolean;
		replyQueue?: string;
		replyQueueOptions?: {
			durable: boolean;
			autoDelete: boolean;
		};
	};
	routingKeys: RoutingKeys;
}
