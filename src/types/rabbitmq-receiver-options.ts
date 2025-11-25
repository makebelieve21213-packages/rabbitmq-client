// Интерфейс опций для настройки connectRabbitMQReceiver (получение сообщений)
export default interface RabbitMQReceiverOptions {
	// Обязательные параметры
	url: string;
	exchange: string;
	exchangeType: string;
	queue: string;
	pattern: string;

	// Опциональные параметры с дефолтными значениями
	prefetchCount?: number; // По умолчанию: 10
	noAck?: boolean; // По умолчанию: false (ручное подтверждение)

	// Параметры для reply очереди RPC паттерна (опциональные, генерируются автоматически)
	replyQueue?: string; // По умолчанию: `${queue}.reply`

	// Параметры для retry очереди (опциональные, генерируются автоматически)
	retryQueue?: string; // По умолчанию: `${queue}.retry`
	retryExchange?: string; // По умолчанию: `${exchange}.retry`
	retryExchangeType?: string; // По умолчанию: exchangeType
	retryTtl?: number; // По умолчанию: 5000 (5 секунд)

	// Параметры для DLX очереди (опциональные, генерируются автоматически)
	dlxQueue?: string; // По умолчанию: `${queue}.dlx`
	dlxExchange?: string; // По умолчанию: `${exchange}.dlx`
	dlxExchangeType?: string; // По умолчанию: exchangeType
}
