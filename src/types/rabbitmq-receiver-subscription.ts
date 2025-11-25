/**
 * Частичная конфигурация для подписки на очередь RabbitMQ
 * Используется для множественных подписок с базовыми параметрами
 */
export default interface RabbitMQReceiverSubscription {
	// Уникальное имя подписки для логирования
	name: string;
	// Имя очереди
	queue: string;
	// Паттерн routing key для подписки
	pattern: string;
	// Опциональные параметры, переопределяющие базовые
	prefetchCount?: number;
	noAck?: boolean;
	retryQueue?: string;
	retryExchange?: string;
	retryExchangeType?: string;
	retryTtl?: number;
	dlxQueue?: string;
	dlxExchange?: string;
	dlxExchangeType?: string;
}
