import type RabbitMQReceiverSubscription from "src/types/rabbitmq-receiver-subscription";

// Тип конфигурации для множественных подписок RabbitMQ
export default interface RabbitMQReceiversConfig {
	// Базовые параметры, общие для всех подписок
	url: string;
	exchange: string;
	exchangeType: string;
	prefetchCount?: number;
	noAck?: boolean;
	retryTtl?: number;
	dlxQueue?: string;
	dlxExchange?: string;
	dlxExchangeType?: string;
	// Массив подписок, каждая может переопределять базовые параметры
	subscriptions: RabbitMQReceiverSubscription[];
}
