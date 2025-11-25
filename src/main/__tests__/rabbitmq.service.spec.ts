import { LoggerService } from "@makebelieve21213-packages/logger";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { lastValueFrom, of, throwError } from "rxjs";
import { createSenderConfig } from "src/config/factories";
import RabbitMQService from "src/main/rabbitmq.service";
import { ROUTING_KEYS } from "src/types/routing-keys";
import { RABBITMQ_SENDER_SERVICE } from "src/utils/injections";

import type { ClientProxy } from "@nestjs/microservices";
import type { TestingModule } from "@nestjs/testing";
import type RabbitMQSenderOptions from "src/types/rabbitmq-sender-options";

// Мокаем модуль lastValueFrom из rxjs
jest.mock("rxjs", () => ({
	...jest.requireActual("rxjs"),
	lastValueFrom: jest.fn(),
}));

// Мокаем createSenderConfig
jest.mock("src/config/factories", () => ({
	createSenderConfig: jest.fn(),
}));

const mockLastValueFrom = lastValueFrom as jest.MockedFunction<typeof lastValueFrom>;
const mockCreateSenderConfig = createSenderConfig as jest.MockedFunction<typeof createSenderConfig>;

describe("RabbitMQService", () => {
	let service: RabbitMQService;
	let clientProxy: jest.Mocked<ClientProxy>;
	let configService: jest.Mocked<ConfigService>;
	let loggerService: jest.Mocked<LoggerService>;

	const mockSenderOptions: RabbitMQSenderOptions = {
		url: "amqp://localhost:5672",
		exchange: "test_exchange",
		exchangeType: "topic",
	};

	const mockRoutingKeys = {
		[ROUTING_KEYS.TOKENS_FETCH_ALL]: ROUTING_KEYS.TOKENS_FETCH_ALL,
		[ROUTING_KEYS.TOKENS_FETCH_DETAILS_ETHEREUM]: ROUTING_KEYS.TOKENS_FETCH_DETAILS_ETHEREUM,
		[ROUTING_KEYS.TOKENS_FETCH_DETAILS_NFT]: ROUTING_KEYS.TOKENS_FETCH_DETAILS_NFT,
		[ROUTING_KEYS.TOKENS_DEPLOY_ETHEREUM]: ROUTING_KEYS.TOKENS_DEPLOY_ETHEREUM,
		[ROUTING_KEYS.TOKENS_DEPLOY_NFT]: ROUTING_KEYS.TOKENS_DEPLOY_NFT,
		[ROUTING_KEYS.ANALYTICS_GLOBAL]: ROUTING_KEYS.ANALYTICS_GLOBAL,
		[ROUTING_KEYS.ANALYTICS_TOTAL_MARKET_CHART]: ROUTING_KEYS.ANALYTICS_TOTAL_MARKET_CHART,
		[ROUTING_KEYS.ANALYTICS_MARKET_CHART]: ROUTING_KEYS.ANALYTICS_MARKET_CHART,
		[ROUTING_KEYS.ANALYTICS_DOMINANCE_CHART]: ROUTING_KEYS.ANALYTICS_DOMINANCE_CHART,
		[ROUTING_KEYS.ANALYTICS_VOLUME_CHART]: ROUTING_KEYS.ANALYTICS_VOLUME_CHART,
		[ROUTING_KEYS.ANALYTICS_TOP_VOLUME_LEADERS]: ROUTING_KEYS.ANALYTICS_TOP_VOLUME_LEADERS,
		[ROUTING_KEYS.ANALYTICS_TRENDING]: ROUTING_KEYS.ANALYTICS_TRENDING,
		[ROUTING_KEYS.ANALYTICS_COINS_TABLE]: ROUTING_KEYS.ANALYTICS_COINS_TABLE,
		[ROUTING_KEYS.ANALYTICS_UPDATE_GLOBAL]: ROUTING_KEYS.ANALYTICS_UPDATE_GLOBAL,
		[ROUTING_KEYS.ANALYTICS_UPDATE_TOTAL_MARKET_CHART]:
			ROUTING_KEYS.ANALYTICS_UPDATE_TOTAL_MARKET_CHART,
		[ROUTING_KEYS.ANALYTICS_UPDATE_MARKET_CHART]: ROUTING_KEYS.ANALYTICS_UPDATE_MARKET_CHART,
		[ROUTING_KEYS.ANALYTICS_UPDATE_DOMINANCE_CHART]: ROUTING_KEYS.ANALYTICS_UPDATE_DOMINANCE_CHART,
		[ROUTING_KEYS.ANALYTICS_UPDATE_VOLUME_CHART]: ROUTING_KEYS.ANALYTICS_UPDATE_VOLUME_CHART,
		[ROUTING_KEYS.ANALYTICS_UPDATE_TOP_VOLUME_LEADERS]:
			ROUTING_KEYS.ANALYTICS_UPDATE_TOP_VOLUME_LEADERS,
		[ROUTING_KEYS.ANALYTICS_UPDATE_TRENDING]: ROUTING_KEYS.ANALYTICS_UPDATE_TRENDING,
		[ROUTING_KEYS.ANALYTICS_UPDATE_COINS_TABLE]: ROUTING_KEYS.ANALYTICS_UPDATE_COINS_TABLE,
	};

	beforeEach(async () => {
		jest.clearAllMocks();

		// Создаем моки для всех зависимостей
		clientProxy = {
			connect: jest.fn().mockResolvedValue(undefined),
			close: jest.fn().mockResolvedValue(undefined),
			emit: jest.fn().mockReturnValue(of(undefined)),
			send: jest.fn().mockReturnValue(of({})),
		} as unknown as jest.Mocked<ClientProxy>;

		configService = {
			get: jest.fn(),
		} as unknown as jest.Mocked<ConfigService>;

		loggerService = {
			setContext: jest.fn(),
			log: jest.fn(),
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
		} as unknown as jest.Mocked<LoggerService>;

		// Настраиваем мок для ConfigService
		configService.get.mockImplementation((key: string) => {
			if (key === "rabbitmqSender") {
				return mockSenderOptions;
			}
			return undefined;
		});

		// Настраиваем мок для createSenderConfig
		mockCreateSenderConfig.mockReturnValue({
			transport: {} as never,
			options: {} as never,
			routingKeys: mockRoutingKeys,
		});

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				RabbitMQService,
				{
					provide: RABBITMQ_SENDER_SERVICE,
					useValue: clientProxy,
				},
				{
					provide: ConfigService,
					useValue: configService,
				},
				{
					provide: LoggerService,
					useValue: loggerService,
				},
			],
		}).compile();

		service = module.get<RabbitMQService>(RabbitMQService);
	});

	describe("конструктор", () => {
		it("должен инициализировать сервис с правильными зависимостями", () => {
			expect(service).toBeDefined();
			expect(configService.get).toHaveBeenCalledWith("rabbitmqSender");
			expect(loggerService.setContext).toHaveBeenCalledWith("RabbitMQService");
			expect(mockCreateSenderConfig).toHaveBeenCalledWith(mockSenderOptions);
		});

		it("должен вычислить конфигурацию динамически через createSenderConfig", () => {
			expect(mockCreateSenderConfig).toHaveBeenCalledWith(mockSenderOptions);
			expect(loggerService.log).toHaveBeenCalledWith(
				expect.stringContaining("RabbitMQ routing keys initialized")
			);
		});

		it("должен использовать routing keys из вычисленной конфигурации", () => {
			const testData = { test: "data" };
			service.fireAndForget(ROUTING_KEYS.TOKENS_FETCH_ALL, testData);
			expect(clientProxy.emit).toHaveBeenCalledWith(ROUTING_KEYS.TOKENS_FETCH_ALL, testData);
		});

		it("должен правильно инициализировать все параметры конструктора", () => {
			expect(service).toBeDefined();
			expect(clientProxy).toBeDefined();
			expect(configService).toBeDefined();
		});

		it("должен выбросить ошибку если senderOptions не найдены в конфигурации", () => {
			// Создаем новый ConfigService который возвращает undefined для rabbitmqSender
			const emptyConfigService = {
				get: jest.fn().mockReturnValue(undefined),
			} as unknown as jest.Mocked<ConfigService>;

			// Ошибка выбрасывается в конструкторе, поэтому нужно использовать try-catch
			expect(() => {
				new RabbitMQService(clientProxy, emptyConfigService, loggerService);
			}).toThrow("RabbitMQ sender options not found in configuration");
		});

		it("должен использовать client и configService параметры конструктора", async () => {
			// Создаем новые моки для явной проверки использования параметров
			const testClientProxy = {
				connect: jest.fn().mockResolvedValue(undefined),
				close: jest.fn().mockResolvedValue(undefined),
				emit: jest.fn().mockReturnValue(of(undefined)),
				send: jest.fn().mockReturnValue(of({})),
			} as unknown as jest.Mocked<ClientProxy>;

			const testConfigService = {
				get: jest.fn(),
			} as unknown as jest.Mocked<ConfigService>;

			const testLoggerService = {
				setContext: jest.fn(),
				log: jest.fn(),
				info: jest.fn(),
				error: jest.fn(),
				warn: jest.fn(),
			} as unknown as jest.Mocked<LoggerService>;

			// Настраиваем мок для ConfigService
			testConfigService.get.mockImplementation((key: string) => {
				if (key === "rabbitmqSender") {
					return mockSenderOptions;
				}
				return undefined;
			});

			// Настраиваем мок для createSenderConfig
			mockCreateSenderConfig.mockReturnValue({
				transport: {} as never,
				options: {} as never,
				routingKeys: mockRoutingKeys,
			});

			// Создаем новый экземпляр сервиса с тестовыми зависимостями
			const testService = new RabbitMQService(testClientProxy, testConfigService, testLoggerService);

			// Проверяем, что configService был использован в конструкторе
			expect(testConfigService.get).toHaveBeenCalledWith("rabbitmqSender");

			// Проверяем, что client используется через вызов onModuleInit
			await testService.onModuleInit();
			expect(testClientProxy.connect).toHaveBeenCalled();

			// Проверяем, что client используется через вызов fireAndForget
			const testData = { test: "data" };
			testService.fireAndForget(ROUTING_KEYS.TOKENS_FETCH_ALL, testData);
			expect(testClientProxy.emit).toHaveBeenCalledWith(ROUTING_KEYS.TOKENS_FETCH_ALL, testData);

			// Проверяем, что client используется через вызов publish
			const observable = of({ result: "success" });
			testClientProxy.send.mockReturnValue(observable);
			mockLastValueFrom.mockResolvedValue({ result: "success" });
			await testService.publish(ROUTING_KEYS.TOKENS_FETCH_DETAILS_ETHEREUM, testData);
			expect(testClientProxy.send).toHaveBeenCalled();

			// Проверяем, что client используется через вызов onModuleDestroy
			await testService.onModuleDestroy();
			expect(testClientProxy.close).toHaveBeenCalled();
		});
	});

	describe("onModuleInit", () => {
		it("должен подключиться к RabbitMQ и залогировать сообщение", async () => {
			clientProxy.connect.mockResolvedValue(undefined);

			await service.onModuleInit();

			expect(clientProxy.connect).toHaveBeenCalled();
			expect(loggerService.log).toHaveBeenCalledWith("RabbitMQ connected");
		});

		it("должен передать ошибку при неудачном подключении", async () => {
			const error = new Error("Connection failed");
			clientProxy.connect.mockRejectedValue(error);

			await expect(service.onModuleInit()).rejects.toThrow("Connection failed");
		});
	});

	describe("onModuleDestroy", () => {
		it("должен отключиться от RabbitMQ и залогировать сообщение", async () => {
			clientProxy.close.mockResolvedValue(undefined);

			await service.onModuleDestroy();

			expect(clientProxy.close).toHaveBeenCalled();
			expect(loggerService.log).toHaveBeenCalledWith("RabbitMQ disconnected");
		});

		it("должен передать ошибку при неудачном отключении", async () => {
			const error = new Error("Disconnect failed");
			clientProxy.close.mockRejectedValue(error);

			await expect(service.onModuleDestroy()).rejects.toThrow("Disconnect failed");
		});
	});

	describe("fireAndForget", () => {
		it("должен отправить сообщение без ожидания ответа", () => {
			const testData = { test: "data" };
			const routingKey = ROUTING_KEYS.TOKENS_FETCH_ALL;

			service.fireAndForget(routingKey, testData);

			expect(loggerService.log).toHaveBeenCalledWith(
				`fireAndForget [routingKey=${routingKey}, data=${JSON.stringify(testData)}]`
			);
			expect(clientProxy.emit).toHaveBeenCalledWith(routingKey, testData);
		});

		it("должен корректно обработать пустые данные", () => {
			const testData = {};
			const routingKey = ROUTING_KEYS.ANALYTICS_GLOBAL;

			service.fireAndForget(routingKey, testData);

			expect(loggerService.log).toHaveBeenCalledWith(
				`fireAndForget [routingKey=${routingKey}, data=${JSON.stringify(testData)}]`
			);
			expect(clientProxy.emit).toHaveBeenCalledWith(routingKey, testData);
		});

		it("должен корректно обработать сложные объекты", () => {
			const testData = {
				nested: { value: 123 },
				array: [1, 2, 3],
				boolean: true,
			};
			const routingKey = ROUTING_KEYS.TOKENS_DEPLOY_ETHEREUM;

			service.fireAndForget(routingKey, testData);

			expect(loggerService.log).toHaveBeenCalledWith(
				`fireAndForget [routingKey=${routingKey}, data=${JSON.stringify(testData)}]`
			);
			expect(clientProxy.emit).toHaveBeenCalledWith(routingKey, testData);
		});

		it("должен обработать ошибку отправки через subscribe", () => {
			const testData = { test: "data" };
			const routingKey = ROUTING_KEYS.TOKENS_FETCH_ALL;
			const error = new Error("Emit failed");

			clientProxy.emit.mockReturnValue(throwError(() => error));

			service.fireAndForget(routingKey, testData);

			expect(loggerService.log).toHaveBeenCalled();
			expect(clientProxy.emit).toHaveBeenCalledWith(routingKey, testData);
		});
	});

	describe("publish", () => {
		it("должен отправить сообщение с correlationId и вернуть ответ", async () => {
			const testData = { input: "test" };
			const expectedResponse = { output: "response" };
			const routingKey = ROUTING_KEYS.TOKENS_FETCH_DETAILS_ETHEREUM;

			const observable = of(expectedResponse);
			clientProxy.send.mockReturnValue(observable);
			mockLastValueFrom.mockResolvedValue(expectedResponse);

			const result = await service.publish(routingKey, testData);

			expect(loggerService.log).toHaveBeenCalledWith(
				expect.stringContaining(`publish [routingKey=${routingKey}, correlationId=`)
			);
			expect(loggerService.log).toHaveBeenCalledWith(
				expect.stringContaining(`data=${JSON.stringify(testData)}]`)
			);

			expect(clientProxy.send).toHaveBeenCalledWith(
				routingKey,
				expect.objectContaining({
					...testData,
					correlationId: expect.any(String),
					correlationTimestamp: expect.any(Number),
				})
			);
			expect(mockLastValueFrom).toHaveBeenCalledWith(observable);
			expect(result).toEqual(expectedResponse);
		});

		it("должен добавить correlationId и correlationTimestamp к сообщению", async () => {
			const testData = { input: "test" };
			const expectedResponse = { output: "response" };
			const routingKey = ROUTING_KEYS.TOKENS_FETCH_DETAILS_NFT;

			const observable = of(expectedResponse);
			clientProxy.send.mockReturnValue(observable);
			mockLastValueFrom.mockResolvedValue(expectedResponse);

			await service.publish(routingKey, testData);

			const sendCall = clientProxy.send.mock.calls[0];
			const messageWithCorrelation = sendCall[1] as {
				correlationId: string;
				correlationTimestamp: number;
				input: string;
			};

			expect(messageWithCorrelation.correlationId).toBeDefined();
			expect(typeof messageWithCorrelation.correlationId).toBe("string");
			expect(messageWithCorrelation.correlationTimestamp).toBeDefined();
			expect(typeof messageWithCorrelation.correlationTimestamp).toBe("number");
			expect(messageWithCorrelation.input).toBe("test");
		});

		it("должен обработать необъектные данные, обернув их в объект", async () => {
			const testData = "string data";
			const expectedResponse = { output: "response" };
			const routingKey = ROUTING_KEYS.ANALYTICS_GLOBAL;

			const observable = of(expectedResponse);
			clientProxy.send.mockReturnValue(observable);
			mockLastValueFrom.mockResolvedValue(expectedResponse);

			await service.publish(routingKey, testData);

			const sendCall = clientProxy.send.mock.calls[0];
			const messageWithCorrelation = sendCall[1] as {
				correlationId: string;
				correlationTimestamp: number;
				data: string;
			};

			expect(messageWithCorrelation.correlationId).toBeDefined();
			expect(messageWithCorrelation.correlationTimestamp).toBeDefined();
			expect(messageWithCorrelation.data).toBe("string data");
		});

		it("должен передать ошибку при неудачной отправке", async () => {
			const testData = { input: "test" };
			const routingKey = ROUTING_KEYS.TOKENS_FETCH_DETAILS_NFT;
			const error = new Error("Send failed");

			const observable = throwError(() => error);
			clientProxy.send.mockReturnValue(observable);
			mockLastValueFrom.mockRejectedValue(error);

			await expect(service.publish(routingKey, testData)).rejects.toThrow("Send failed");

			expect(loggerService.log).toHaveBeenCalledWith(
				expect.stringContaining(`publish [routingKey=${routingKey}`)
			);
			expect(clientProxy.send).toHaveBeenCalled();
		});

		it("должен работать с разными типами данных входа и выхода", async () => {
			interface InputType {
				id: number;
				name: string;
			}

			interface OutputType {
				success: boolean;
				result: string;
			}

			const testData: InputType = { id: 1, name: "test" };
			const expectedResponse: OutputType = {
				success: true,
				result: "processed",
			};
			const routingKey = ROUTING_KEYS.ANALYTICS_TRENDING;

			const observable = of(expectedResponse);
			clientProxy.send.mockReturnValue(observable);
			mockLastValueFrom.mockResolvedValue(expectedResponse);

			const result = await service.publish<InputType, OutputType>(routingKey, testData);

			expect(result).toEqual(expectedResponse);
			expect(result.success).toBe(true);
			expect(result.result).toBe("processed");
		});
	});

	describe("интеграция routing keys", () => {
		it("должен использовать правильные routing keys для всех типов операций", () => {
			const testData = { test: "data" };

			// Тестируем все routing keys
			Object.values(ROUTING_KEYS).forEach((routingKey) => {
				service.fireAndForget(routingKey, testData);
				expect(clientProxy.emit).toHaveBeenCalledWith(routingKey, testData);
			});

			expect(clientProxy.emit).toHaveBeenCalledTimes(Object.values(ROUTING_KEYS).length);
		});
	});

	describe("динамическое вычисление конфигурации", () => {
		it("должен вычислить конфигурацию динамически через createSenderConfig", () => {
			expect(mockCreateSenderConfig).toHaveBeenCalledWith(mockSenderOptions);
			expect(service).toBeDefined();
		});

		it("должен использовать вычисленные routing keys для отправки сообщений", () => {
			const testData = { test: "data" };
			service.fireAndForget(ROUTING_KEYS.TOKENS_FETCH_ALL, testData);

			expect(clientProxy.emit).toHaveBeenCalledWith(ROUTING_KEYS.TOKENS_FETCH_ALL, testData);
		});
	});
});
