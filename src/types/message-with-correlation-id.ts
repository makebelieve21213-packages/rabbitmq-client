/**
 * Интерфейс для сообщения с correlationId для идемпотентности
 * Используется для отслеживания дубликатов сообщений через RabbitMQ
 */
export interface MessageWithCorrelationId {
	correlationId: string;
	correlationTimestamp: number;
	[key: string]: unknown;
}
