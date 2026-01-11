import { Transport } from "@nestjs/microservices/enums/transport.enum";
import {
	createSenderConfig,
	createReceiverConfig,
	createRetryConfig,
	createDLXConfig,
} from "src/config/factories";

import type RabbitMQReceiverOptions from "src/types/rabbitmq-receiver-options";
import type RabbitMQSenderOptions from "src/types/rabbitmq-sender-options";

describe("RabbitMQ Config Factories", () => {
	// Моковые routing keys для тестов
	const mockRoutingKeys = {
		"test.key.1": "test.key.1",
		"test.key.2": "test.key.2",
		"test.key.3": "test.key.3",
	};

	const baseSenderOptions: RabbitMQSenderOptions = {
		url: "amqp://localhost:5672",
		exchange: "events_exchange",
		exchangeType: "topic",
		routingKeys: mockRoutingKeys,
	};

	const baseReceiverOptions: RabbitMQReceiverOptions = {
		url: "amqp://localhost:5672",
		exchange: "events_exchange",
		exchangeType: "topic",
		queue: "q.analytics",
		pattern: "analytics.*",
	};

	describe("createSenderConfig", () => {
		it("должен создать конфигурацию sender с правильными параметрами", () => {
			const config = createSenderConfig(baseSenderOptions);

			expect(config.transport).toBe(Transport.RMQ);
			expect(config.options.urls).toEqual([baseSenderOptions.url]);
			expect(config.options.exchange).toBe(baseSenderOptions.exchange);
			expect(config.options.exchangeType).toBe(baseSenderOptions.exchangeType);
			expect(config.options.wildcards).toBe(true);
			expect(config.options.durable).toBe(true);
		});

		it("должен создать конфигурацию sender со всеми routing keys", () => {
			const config = createSenderConfig(baseSenderOptions);

			expect(config.routingKeys).toBeDefined();
			expect(config.routingKeys["test.key.1"]).toBe("test.key.1");
			expect(config.routingKeys["test.key.2"]).toBe("test.key.2");
			expect(config.routingKeys).toEqual(mockRoutingKeys);
		});

		it("должен выбросить ошибку если routingKeys не переданы", () => {
			const optionsWithoutRoutingKeys = {
				url: "amqp://localhost:5672",
				exchange: "events_exchange",
				exchangeType: "topic",
			} as unknown as RabbitMQSenderOptions;

			expect(() => createSenderConfig(optionsWithoutRoutingKeys)).toThrow(
				"routingKeys is required in RabbitMQ sender configuration"
			);
		});

		it("должен использовать дефолтные replyQueueOptions если не указаны", () => {
			const config = createSenderConfig(baseSenderOptions);

			expect(config.options.replyQueueOptions).toBeDefined();
			expect(config.options.replyQueueOptions?.durable).toBe(false);
			expect(config.options.replyQueueOptions?.autoDelete).toBe(true);
		});

		it("должен использовать кастомные replyQueueOptions если указаны", () => {
			const options: RabbitMQSenderOptions = {
				...baseSenderOptions,
				replyQueueOptions: {
					durable: true,
					autoDelete: false,
				},
			};
			const config = createSenderConfig(options);

			expect(config.options.replyQueueOptions?.durable).toBe(true);
			expect(config.options.replyQueueOptions?.autoDelete).toBe(false);
		});
	});

	describe("createReceiverConfig", () => {
		it("должен создать конфигурацию receiver с правильными параметрами", () => {
			const config = createReceiverConfig(baseReceiverOptions);

			expect(config.transport).toBe(Transport.RMQ);
			expect(config.options.urls).toEqual([baseReceiverOptions.url]);
			expect(config.options.queue).toBe(baseReceiverOptions.queue);
			expect(config.options.exchange).toBe(baseReceiverOptions.exchange);
			expect(config.options.exchangeType).toBe(baseReceiverOptions.exchangeType);
			expect(config.options.pattern).toBe(baseReceiverOptions.pattern);
			expect(config.options.wildcards).toBe(true);
			expect(config.options.prefetchCount).toBe(10);
			expect(config.options.noAck).toBe(false);
		});

		it("должен использовать дефолтный prefetchCount если не указан", () => {
			const config = createReceiverConfig(baseReceiverOptions);

			expect(config.options.prefetchCount).toBe(10);
		});

		it("должен использовать кастомный prefetchCount если указан", () => {
			const options: RabbitMQReceiverOptions = {
				...baseReceiverOptions,
				prefetchCount: 20,
			};
			const config = createReceiverConfig(options);

			expect(config.options.prefetchCount).toBe(20);
		});

		it("должен использовать кастомный noAck если указан", () => {
			const options: RabbitMQReceiverOptions = {
				...baseReceiverOptions,
				noAck: true,
			};
			const config = createReceiverConfig(options);

			expect(config.options.noAck).toBe(true);
		});

		it("должен создать DLX настройки для retry очереди", () => {
			const config = createReceiverConfig(baseReceiverOptions);

			expect(config.options.queueOptions.arguments["x-dead-letter-exchange"]).toBe(
				`${baseReceiverOptions.exchange}.retry`
			);
			expect(config.options.queueOptions.arguments["x-dead-letter-routing-key"]).toBe(
				baseReceiverOptions.pattern
			);
		});

		it("должен использовать кастомный retryExchange если указан", () => {
			const options: RabbitMQReceiverOptions = {
				...baseReceiverOptions,
				retryExchange: "custom.retry.exchange",
			};
			const config = createReceiverConfig(options);

			expect(config.options.queueOptions.arguments["x-dead-letter-exchange"]).toBe(
				"custom.retry.exchange"
			);
		});

		it("должен использовать переданный pattern вместо pattern из options", () => {
			const customPattern = "custom.pattern.*";
			const config = createReceiverConfig(baseReceiverOptions, customPattern);

			expect(config.options.pattern).toBe(customPattern);
			expect(config.options.queueOptions.arguments["x-dead-letter-routing-key"]).toBe(customPattern);
		});
	});

	describe("createRetryConfig", () => {
		it("должен создать конфигурацию retry с правильными параметрами", () => {
			const config = createRetryConfig(baseReceiverOptions);

			expect(config.transport).toBe(Transport.RMQ);
			expect(config.options.urls).toEqual([baseReceiverOptions.url]);
			expect(config.options.queue).toBe(`${baseReceiverOptions.queue}.retry`);
			expect(config.options.exchange).toBe(`${baseReceiverOptions.exchange}.retry`);
			expect(config.options.exchangeType).toBe(baseReceiverOptions.exchangeType);
		});

		it("должен использовать дефолтный TTL если не указан", () => {
			const config = createRetryConfig(baseReceiverOptions);

			expect(config.options.queueOptions.arguments["x-message-ttl"]).toBe(5000);
		});

		it("должен использовать кастомный TTL если указан", () => {
			const options: RabbitMQReceiverOptions = {
				...baseReceiverOptions,
				retryTtl: 10000,
			};
			const config = createRetryConfig(options);

			expect(config.options.queueOptions.arguments["x-message-ttl"]).toBe(10000);
		});

		it("должен создать DLX настройки для возврата в основную очередь", () => {
			const config = createRetryConfig(baseReceiverOptions);

			expect(config.options.queueOptions.arguments["x-dead-letter-exchange"]).toBe(
				baseReceiverOptions.exchange
			);
			expect(config.options.queueOptions.arguments["x-dead-letter-routing-key"]).toBe(
				baseReceiverOptions.pattern
			);
		});

		it("должен использовать кастомные параметры retry если указаны", () => {
			const options: RabbitMQReceiverOptions = {
				...baseReceiverOptions,
				retryQueue: "custom.retry.queue",
				retryExchange: "custom.retry.exchange",
				retryExchangeType: "direct",
			};
			const config = createRetryConfig(options);

			expect(config.options.queue).toBe("custom.retry.queue");
			expect(config.options.exchange).toBe("custom.retry.exchange");
			expect(config.options.exchangeType).toBe("direct");
		});
	});

	describe("createDLXConfig", () => {
		it("должен создать конфигурацию DLX с дефолтными параметрами", () => {
			const config = createDLXConfig(baseReceiverOptions);

			expect(config.transport).toBe(Transport.RMQ);
			expect(config.options.urls).toEqual([baseReceiverOptions.url]);
			expect(config.options.queue).toBe("global.dlx");
			expect(config.options.exchange).toBe("events_exchange.dlx");
			expect(config.options.exchangeType).toBe(baseReceiverOptions.exchangeType);
			expect(config.options.wildcards).toBe(true);
		});

		it("должен использовать кастомные параметры DLX если указаны", () => {
			const options: RabbitMQReceiverOptions = {
				...baseReceiverOptions,
				dlxQueue: "custom.dlx.queue",
				dlxExchange: "custom.dlx.exchange",
				dlxExchangeType: "fanout",
			};
			const config = createDLXConfig(options);

			expect(config.options.queue).toBe("custom.dlx.queue");
			expect(config.options.exchange).toBe("custom.dlx.exchange");
			expect(config.options.exchangeType).toBe("fanout");
		});
	});
});
