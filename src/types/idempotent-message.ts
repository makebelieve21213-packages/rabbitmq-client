// Интерфейс для идемпотентного сообщения с уникальным ID и timestamp
export default interface IdempotentMessage<T> {
	id: string; // Уникальный ID сообщения (uuidv4)
	timestamp: number; // Timestamp создания сообщения
	data: T; // Данные сообщения
}
