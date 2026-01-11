import type { RoutingKeys } from "src/types/routing-keys";

// Интерфейс опций для настройки RabbitMQModule (отправка сообщений)
export default interface RabbitMQSenderOptions {
	// Обязательные параметры для отправки сообщений
	url: string;
	exchange: string;
	exchangeType: string;

	// Обязательный список routing keys для отправки сообщений
	routingKeys: RoutingKeys;

	// Опциональные параметры для reply очередей RPC паттерна
	replyQueueOptions?: {
		durable?: boolean; // По умолчанию: false (временные очереди)
		autoDelete?: boolean; // По умолчанию: true (автоматическое удаление)
	};
}
