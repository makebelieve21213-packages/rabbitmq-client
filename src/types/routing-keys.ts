// Тип для routing keys - извлекается из конфигурации RabbitMQSenderOptions
export type RoutingKey = string;

// Тип для объекта routing keys из конфигурации
export type RoutingKeys = Record<string, string>;
