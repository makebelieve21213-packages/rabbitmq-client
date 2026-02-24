/**
 * AMQP consume message — content и properties из amqplib
 * Используется при обработке сообщений в channel.consume callback
 */
export interface AmqpConsumeMessage extends Record<string, unknown> {
	content: Buffer;
	fields?: Record<string, unknown>;
	properties?: Record<string, unknown>;
}
