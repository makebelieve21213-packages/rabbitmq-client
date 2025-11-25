import { LoggerService } from "@makebelieve21213-packages/logger";
import { RedisClientService } from "@makebelieve21213-packages/redis-client";
import { createDLXConfig, createReceiverConfig, createRetryConfig } from "src/config/factories";
import connectRabbitMQReceiver from "src/connect-rabbitmq-receiver";
import RabbitMQIdempotencyInterceptor from "src/interceptors/rabbitmq.interceptor";

import type { INestApplication } from "@nestjs/common";
import type RabbitMQReceiverOptions from "src/types/rabbitmq-receiver-options";

jest.mock("src/config/factories");
jest.mock("src/interceptors/rabbitmq.interceptor");
jest.mock("@makebelieve21213-packages/logger");
jest.mock("@makebelieve21213-packages/redis-client");

const mockCreateReceiverConfig = createReceiverConfig as jest.MockedFunction<
	typeof createReceiverConfig
>;
const mockCreateRetryConfig = createRetryConfig as jest.MockedFunction<typeof createRetryConfig>;
const mockCreateDLXConfig = createDLXConfig as jest.MockedFunction<typeof createDLXConfig>;
const mockRabbitMQIdempotencyInterceptor = RabbitMQIdempotencyInterceptor as jest.MockedClass<
	typeof RabbitMQIdempotencyInterceptor
>;

describe("connectRabbitMQReceiver", () => {
	let app: jest.Mocked<INestApplication>;
	let loggerService: jest.Mocked<LoggerService>;
	let redisService: jest.Mocked<RedisClientService>;
	let receiverOptions: RabbitMQReceiverOptions;

	const mockReceiverConfig = {
		transport: {} as never,
		options: {
			urls: ["amqp://localhost:5672"],
			queue: "test.queue",
			queueOptions: {
				durable: true,
				arguments: {
					"x-dead-letter-exchange": "test_exchange.retry",
					"x-dead-letter-routing-key": "test.*",
				},
			},
			exchange: "test_exchange",
			exchangeType: "topic",
			wildcards: true,
			pattern: "test.*",
			prefetchCount: 10,
			noAck: false,
		},
	};

	const mockRetryConfig = {
		transport: {} as never,
		options: {
			urls: ["amqp://localhost:5672"],
			queue: "test.queue.retry",
			queueOptions: {
				durable: true,
				arguments: {
					"x-dead-letter-exchange": "test_exchange",
					"x-dead-letter-routing-key": "test.*",
					"x-message-ttl": 5000,
				},
			},
			exchange: "test_exchange.retry",
			exchangeType: "topic",
			wildcards: true,
		},
	};

	const mockDLXConfig = {
		transport: {} as never,
		options: {
			urls: ["amqp://localhost:5672"],
			queue: "global.dlx",
			queueOptions: {
				durable: true,
			},
			exchange: "events_exchange.dlx",
			exchangeType: "topic",
			wildcards: true,
		},
	};

	beforeEach(() => {
		jest.clearAllMocks();

		receiverOptions = {
			url: "amqp://localhost:5672",
			exchange: "test_exchange",
			exchangeType: "topic",
			queue: "test.queue",
			pattern: "test.*",
			prefetchCount: 10,
			noAck: false,
		};

		loggerService = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
			setContext: jest.fn(),
			info: jest.fn(),
		} as unknown as jest.Mocked<LoggerService>;

		redisService = {} as unknown as jest.Mocked<RedisClientService>;

		app = {
			resolve: jest.fn(),
			connectMicroservice: jest.fn(),
			useGlobalInterceptors: jest.fn(),
			getMicroservices: jest.fn().mockReturnValue([]),
		} as unknown as jest.Mocked<INestApplication>;

		app.resolve.mockImplementation(async (token: unknown) => {
			if (token === LoggerService) {
				return loggerService;
			}
			if (token === RedisClientService) {
				return redisService;
			}
			return undefined;
		});

		mockCreateReceiverConfig.mockReturnValue(mockReceiverConfig);
		mockCreateRetryConfig.mockReturnValue(mockRetryConfig);
		mockCreateDLXConfig.mockReturnValue(mockDLXConfig);
		mockRabbitMQIdempotencyInterceptor.mockImplementation(
			() => ({}) as RabbitMQIdempotencyInterceptor
		);
	});

	describe("базовая функциональность", () => {
		it("должен создать конфигурации для receiver, retry и DLX", async () => {
			await connectRabbitMQReceiver(app, receiverOptions);

			expect(mockCreateReceiverConfig).toHaveBeenCalledWith(receiverOptions);
			expect(mockCreateRetryConfig).toHaveBeenCalledWith(receiverOptions);
			expect(mockCreateDLXConfig).toHaveBeenCalledWith(receiverOptions);
		});

		it("должен подключить receiver микросервис", async () => {
			await connectRabbitMQReceiver(app, receiverOptions);

			expect(app.connectMicroservice).toHaveBeenCalledWith({
				transport: mockReceiverConfig.transport,
				options: mockReceiverConfig.options,
			});
		});

		it("должен подключить retry микросервис", async () => {
			await connectRabbitMQReceiver(app, receiverOptions);

			expect(app.connectMicroservice).toHaveBeenCalledWith({
				transport: mockRetryConfig.transport,
				options: mockRetryConfig.options,
			});
		});

		it("должен залогировать подключение receiver", async () => {
			await connectRabbitMQReceiver(app, receiverOptions);

			expect(loggerService.log).toHaveBeenCalledWith(
				`RabbitMQ receiver connected [queue: ${receiverOptions.queue}, pattern: ${receiverOptions.pattern}, exchange: ${receiverOptions.exchange}, exchangeType: ${receiverOptions.exchangeType}]`
			);
		});
	});

	describe("глобальная настройка", () => {
		it("должен установить глобальный интерцептор идемпотентности при skipGlobalSetup = false", async () => {
			await connectRabbitMQReceiver(app, receiverOptions, false);

			expect(mockRabbitMQIdempotencyInterceptor).toHaveBeenCalledWith(redisService, loggerService);
			expect(app.useGlobalInterceptors).toHaveBeenCalledTimes(1);
			expect(app.useGlobalInterceptors).toHaveBeenCalledWith(expect.objectContaining({}));
		});

		it("не должен устанавливать глобальные интерцепторы при skipGlobalSetup = true", async () => {
			await connectRabbitMQReceiver(app, receiverOptions, true);

			expect(app.useGlobalInterceptors).not.toHaveBeenCalled();
		});

		it("не должен подключать DLX микросервис при skipGlobalSetup = true", async () => {
			await connectRabbitMQReceiver(app, receiverOptions, true);

			const dlxCalls = (app.connectMicroservice as jest.Mock).mock.calls.filter(
				(call) => call[0].options.queue === mockDLXConfig.options.queue
			);

			expect(dlxCalls).toHaveLength(0);
		});
	});

	describe("DLX очередь", () => {
		it("должен подключить DLX микросервис при skipGlobalSetup = false", async () => {
			await connectRabbitMQReceiver(app, receiverOptions, false);

			const dlxCalls = (app.connectMicroservice as jest.Mock).mock.calls.filter(
				(call) => call[0].options.queue === mockDLXConfig.options.queue
			);

			expect(dlxCalls).toHaveLength(1);
			expect(dlxCalls[0][0]).toEqual({
				transport: mockDLXConfig.transport,
				options: mockDLXConfig.options,
			});
		});

		it("не должен подключать DLX микросервис если он уже подключен", async () => {
			const existingMicroservice = {
				options: {
					queue: mockDLXConfig.options.queue,
				},
			};

			app.getMicroservices.mockReturnValue([existingMicroservice] as never[]);

			await connectRabbitMQReceiver(app, receiverOptions, false);

			const dlxCalls = (app.connectMicroservice as jest.Mock).mock.calls.filter(
				(call) => call[0].options.queue === mockDLXConfig.options.queue
			);

			expect(dlxCalls).toHaveLength(0);
		});

		it("должен проверить существующие микросервисы перед подключением DLX", async () => {
			await connectRabbitMQReceiver(app, receiverOptions, false);

			expect(app.getMicroservices).toHaveBeenCalled();
		});
	});

	describe("разрешение зависимостей", () => {
		it("должен разрешить LoggerService из приложения", async () => {
			await connectRabbitMQReceiver(app, receiverOptions);

			expect(app.resolve).toHaveBeenCalledWith(LoggerService);
		});

		it("должен разрешить RedisService из приложения", async () => {
			await connectRabbitMQReceiver(app, receiverOptions);

			expect(app.resolve).toHaveBeenCalledWith(RedisClientService);
		});
	});

	describe("порядок вызовов", () => {
		it("должен установить глобальный интерцептор перед подключением микросервисов", async () => {
			await connectRabbitMQReceiver(app, receiverOptions, false);

			const useGlobalInterceptorsCallOrder = (app.useGlobalInterceptors as jest.Mock).mock
				.invocationCallOrder[0];
			const connectMicroserviceCallOrder = (app.connectMicroservice as jest.Mock).mock
				.invocationCallOrder[0];

			expect(useGlobalInterceptorsCallOrder).toBeLessThan(connectMicroserviceCallOrder);
		});

		it("должен подключить receiver перед retry", async () => {
			await connectRabbitMQReceiver(app, receiverOptions);

			const receiverCallOrder = (app.connectMicroservice as jest.Mock).mock.calls.findIndex(
				(call) => call[0].options.queue === mockReceiverConfig.options.queue
			);
			const retryCallOrder = (app.connectMicroservice as jest.Mock).mock.calls.findIndex(
				(call) => call[0].options.queue === mockRetryConfig.options.queue
			);

			expect(receiverCallOrder).toBeLessThan(retryCallOrder);
		});
	});
});
