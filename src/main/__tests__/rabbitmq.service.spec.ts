import { LoggerService } from "@makebelieve21213-packages/logger";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { lastValueFrom, of, throwError } from "rxjs";
import { createSenderConfig } from "src/config/factories";
import RabbitMQService from "src/main/rabbitmq.service";
import { RABBITMQ_SENDER_SERVICE } from "src/utils/injections";

import type { ClientProxy, RmqRecordOptions } from "@nestjs/microservices";
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

	// Моковые routing keys для тестов
	const mockRoutingKeys: Record<string, string> = {
		"test.key.1": "test.key.1",
		"test.key.2": "test.key.2",
		"test.key.3": "test.key.3",
		"test.key.4": "test.key.4",
		"test.key.5": "test.key.5",
	};

	const mockSenderOptions: RabbitMQSenderOptions = {
		url: "amqp://localhost:5672",
		exchange: "test_exchange",
		exchangeType: "topic",
		routingKeys: mockRoutingKeys,
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
			service.fireAndForget("test.key.1", testData);
			expect(clientProxy.emit).toHaveBeenCalledWith("test.key.1", testData);
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
			testService.fireAndForget("test.key.1", testData);
			expect(testClientProxy.emit).toHaveBeenCalledWith("test.key.1", testData);

			// Проверяем, что client используется через вызов publish
			const observable = of({ result: "success" });
			testClientProxy.send.mockReturnValue(observable);
			mockLastValueFrom.mockResolvedValue({ result: "success" });
			await testService.publish("test.key.2", testData);
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
			const routingKey = "test.key.1";

			service.fireAndForget(routingKey, testData);

			expect(loggerService.log).toHaveBeenCalledWith(
				`fireAndForget [routingKey=${routingKey}, data=${JSON.stringify(testData)}]`
			);
			expect(clientProxy.emit).toHaveBeenCalledWith(routingKey, testData);
		});

		it("должен корректно обработать пустые данные", () => {
			const testData = {};
			const routingKey = "test.key.2";

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
			const routingKey = "test.key.3";

			service.fireAndForget(routingKey, testData);

			expect(loggerService.log).toHaveBeenCalledWith(
				`fireAndForget [routingKey=${routingKey}, data=${JSON.stringify(testData)}]`
			);
			expect(clientProxy.emit).toHaveBeenCalledWith(routingKey, testData);
		});

		it("должен обработать ошибку отправки через subscribe", () => {
			const testData = { test: "data" };
			const routingKey = "test.key.1";
			const error = new Error("Emit failed");

			clientProxy.emit.mockReturnValue(throwError(() => error));

			service.fireAndForget(routingKey, testData);

			expect(loggerService.log).toHaveBeenCalled();
			expect(clientProxy.emit).toHaveBeenCalledWith(routingKey, testData);
		});

		it("должен залогировать ошибку и не отправлять сообщение если routing key не найден", () => {
			const testData = { test: "data" };
			const nonExistentKey = "non.existent.key";

			service.fireAndForget(nonExistentKey, testData);

			expect(loggerService.error).toHaveBeenCalledWith(
				`Routing key "${nonExistentKey}" not found in configuration`
			);
			expect(clientProxy.emit).not.toHaveBeenCalled();
			expect(loggerService.log).not.toHaveBeenCalledWith(
				expect.stringContaining("fireAndForget")
			);
		});
	});

	describe("publish", () => {
		it("должен отправить сообщение с correlationId и вернуть ответ", async () => {
			const testData = { input: "test" };
			const expectedResponse = { output: "response" };
			const routingKey = "test.key.2";

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
			const routingKey = "test.key.3";

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
			const routingKey = "test.key.2";

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
			const routingKey = "test.key.3";
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
			const routingKey = "test.key.4";

			const observable = of(expectedResponse);
			clientProxy.send.mockReturnValue(observable);
			mockLastValueFrom.mockResolvedValue(expectedResponse);

			const result = await service.publish<InputType, OutputType>(routingKey, testData);

			expect(result).toEqual(expectedResponse);
			expect(result.success).toBe(true);
			expect(result.result).toBe("processed");
		});

		it("должен отправить сообщение с заголовками когда options передан", async () => {
			const testData = { input: "test" };
			const expectedResponse = { output: "response" };
			const routingKey = "test.key.2";
			const options: RmqRecordOptions = {
				headers: {
					"x-locale": "ru",
					"x-request-id": "test-request-id",
				},
				priority: 5,
			};

			const observable = of(expectedResponse);
			clientProxy.send.mockReturnValue(observable);
			mockLastValueFrom.mockResolvedValue(expectedResponse);

			await service.publish(routingKey, testData, options);

			// Проверяем, что send был вызван с правильными параметрами
			expect(clientProxy.send).toHaveBeenCalledWith(routingKey, expect.any(Object));

			// Проверяем, что был использован RmqRecordBuilder
			const sendCall = clientProxy.send.mock.calls[0];
			const message = sendCall[1] as {
				data: { input: string; correlationId: string; correlationTimestamp: number };
				options: { headers: Record<string, string>; priority: number };
			};

			// RmqRecordBuilder создает объект с полями data и options
			expect(message).toHaveProperty("data");
			expect(message).toHaveProperty("options");
			expect(message.options).toHaveProperty("headers");
			expect(message.options.headers).toEqual(options.headers);
			expect(message.options.priority).toBe(options.priority);

			// Проверяем, что данные с correlationId находятся в data
			expect(message.data).toHaveProperty("correlationId");
			expect(message.data).toHaveProperty("correlationTimestamp");
			expect(message.data.input).toBe("test");
		});

		it("должен отправить сообщение без заголовков когда options не передан (обратная совместимость)", async () => {
			const testData = { input: "test" };
			const expectedResponse = { output: "response" };
			const routingKey = "test.key.2";

			const observable = of(expectedResponse);
			clientProxy.send.mockReturnValue(observable);
			mockLastValueFrom.mockResolvedValue(expectedResponse);

			await service.publish(routingKey, testData);

			// Проверяем, что send был вызван с простым объектом (без RmqRecordBuilder)
			expect(clientProxy.send).toHaveBeenCalledWith(
				routingKey,
				expect.objectContaining({
					...testData,
					correlationId: expect.any(String),
					correlationTimestamp: expect.any(Number),
				})
			);

			// Проверяем, что НЕ был использован RmqRecordBuilder (нет полей data и options)
			const sendCall = clientProxy.send.mock.calls[0];
			const message = sendCall[1] as {
				input: string;
				correlationId: string;
				correlationTimestamp: number;
			};

			expect(message).not.toHaveProperty("data");
			expect(message).not.toHaveProperty("options");
			expect(message).toHaveProperty("correlationId");
			expect(message).toHaveProperty("correlationTimestamp");
			expect(message.input).toBe("test");
		});

		it("должен корректно обработать options с несколькими заголовками и приоритетом", async () => {
			const testData = { userId: 123 };
			const expectedResponse = { success: true };
			const routingKey = "test.key.1";
			const options: RmqRecordOptions = {
				headers: {
					"x-locale": "en",
					"x-user-id": "123",
					"x-request-id": "req-456",
					"x-client-version": "1.0.0",
				},
				priority: 10,
				messageId: "msg-789",
			};

			const observable = of(expectedResponse);
			clientProxy.send.mockReturnValue(observable);
			mockLastValueFrom.mockResolvedValue(expectedResponse);

			await service.publish(routingKey, testData, options);

			const sendCall = clientProxy.send.mock.calls[0];
			const message = sendCall[1] as {
				data: { userId: number; correlationId: string; correlationTimestamp: number };
				options: {
					headers: Record<string, string>;
					priority: number;
					messageId: string;
				};
			};

			expect(message.options.headers).toEqual(options.headers);
			expect(message.options.priority).toBe(options.priority);
			expect(message.options.messageId).toBe(options.messageId);
			expect(message.data.userId).toBe(123);
			expect(message.data).toHaveProperty("correlationId");
		});

		it("должен выбросить ошибку если routing key не найден в конфигурации", async () => {
			const testData = { input: "test" };
			const nonExistentKey = "non.existent.key";

			await expect(service.publish(nonExistentKey, testData)).rejects.toThrow(
				`Routing key "${nonExistentKey}" not found in configuration`
			);

			expect(clientProxy.send).not.toHaveBeenCalled();
			expect(mockLastValueFrom).not.toHaveBeenCalled();
		});
	});

	describe("интеграция routing keys", () => {
		it("должен использовать правильные routing keys для всех типов операций", () => {
			const testData = { test: "data" };

			// Тестируем все routing keys из моковой конфигурации
			Object.keys(mockRoutingKeys).forEach((routingKey) => {
				service.fireAndForget(routingKey, testData);
				expect(clientProxy.emit).toHaveBeenCalledWith(mockRoutingKeys[routingKey], testData);
			});

			expect(clientProxy.emit).toHaveBeenCalledTimes(Object.keys(mockRoutingKeys).length);
		});
	});

	describe("динамическое вычисление конфигурации", () => {
		it("должен вычислить конфигурацию динамически через createSenderConfig", () => {
			expect(mockCreateSenderConfig).toHaveBeenCalledWith(mockSenderOptions);
			expect(service).toBeDefined();
		});

		it("должен использовать вычисленные routing keys для отправки сообщений", () => {
			const testData = { test: "data" };
			service.fireAndForget("test.key.1", testData);

			expect(clientProxy.emit).toHaveBeenCalledWith("test.key.1", testData);
		});
	});
});
