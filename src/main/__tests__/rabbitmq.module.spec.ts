import { LoggerService } from "@makebelieve21213-packages/logger";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ClientsModule } from "@nestjs/microservices";
import { Test } from "@nestjs/testing";
import { createSenderConfig } from "src/config/factories";
import RabbitMQModule from "src/main/rabbitmq.module";
import RabbitMQService from "src/main/rabbitmq.service";
import { ROUTING_KEYS } from "src/types/routing-keys";
import { RABBITMQ_SENDER_SERVICE } from "src/utils/injections";

import type { TestingModule } from "@nestjs/testing";
import type RabbitMQSenderOptions from "src/types/rabbitmq-sender-options";

// Мокаем createSenderConfig
jest.mock("src/config/factories", () => ({
	createSenderConfig: jest.fn(),
}));

const mockCreateSenderConfig = createSenderConfig as jest.MockedFunction<typeof createSenderConfig>;

// Мокаем ClientsModule.registerAsync
jest.mock("@nestjs/microservices", () => {
	const actual = jest.requireActual("@nestjs/microservices");
	return {
		...actual,
		ClientsModule: {
			...actual.ClientsModule,
			registerAsync: jest.fn(() => ({
				module: actual.ClientsModule,
				providers: [],
				exports: [],
			})),
		},
	};
});

describe("RabbitMQModule", () => {
	let module: TestingModule;
	let rabbitMQService: RabbitMQService;
	let configService: ConfigService;

	// Хелпер для создания мока LoggerService
	const createLoggerServiceMock = () => ({
		log: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		debug: jest.fn(),
		verbose: jest.fn(),
		info: jest.fn(),
		setContext: jest.fn(),
	});

	const mockModuleOptions: RabbitMQSenderOptions = {
		url: "amqp://localhost:5672",
		exchange: "test_exchange",
		exchangeType: "topic",
	};

	const mockSenderConfig = {
		transport: {} as never,
		options: {
			urls: ["amqp://localhost:5672"],
			exchange: "test_exchange",
			exchangeType: "topic",
			wildcards: true,
			durable: true,
		},
		routingKeys: {
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
		},
	};

	beforeEach(async () => {
		jest.clearAllMocks();

		mockCreateSenderConfig.mockReturnValue(mockSenderConfig);

		const mockConfigService = {
			get: jest.fn((key: string) => {
				if (key === "rabbitmqSender") {
					return mockModuleOptions;
				}
				return undefined;
			}),
		};

		module = await Test.createTestingModule({
			providers: [
				RabbitMQService,
				{
					provide: ConfigService,
					useValue: mockConfigService,
				},
				{
					provide: RABBITMQ_SENDER_SERVICE,
					useValue: {
						connect: jest.fn(),
						close: jest.fn(),
						emit: jest.fn(),
						send: jest.fn(),
					},
				},
				{
					provide: LoggerService,
					useValue: createLoggerServiceMock(),
				},
			],
		}).compile();

		rabbitMQService = module.get<RabbitMQService>(RabbitMQService);
		configService = module.get<ConfigService>(ConfigService);
	});

	afterEach(async () => {
		if (module) {
			await module.close();
		}
	});

	describe("инициализация модуля", () => {
		it("должен быть определен", () => {
			expect(module).toBeDefined();
		});

		it("должен предоставлять RabbitMQService", () => {
			expect(rabbitMQService).toBeDefined();
			expect(rabbitMQService).toBeInstanceOf(RabbitMQService);
		});

		it("должен предоставлять ConfigService", () => {
			expect(configService).toBeDefined();
			expect(configService.get).toBeDefined();
		});

		it("должен предоставлять LoggerService", () => {
			const loggerService = module.get<LoggerService>(LoggerService);
			expect(loggerService).toBeDefined();
			expect(loggerService.log).toBeDefined();
		});
	});

	describe("forRootAsync", () => {
		it("должен создать динамический модуль с правильной структурой", () => {
			const dynamicModule = RabbitMQModule.forRootAsync({
				useFactory: () => mockModuleOptions,
			});

			expect(dynamicModule).toBeDefined();
			expect(dynamicModule.module).toBe(RabbitMQModule);
			expect(dynamicModule.imports).toBeDefined();
			expect(dynamicModule.providers).toContain(RabbitMQService);
			expect(dynamicModule.exports).toContain(RabbitMQService);
		});

		it("должен поддерживать опциональные imports", () => {
			const dynamicModule = RabbitMQModule.forRootAsync({
				imports: [ConfigModule],
				useFactory: () => mockModuleOptions,
			});

			expect(dynamicModule).toBeDefined();
			expect(dynamicModule.imports).toBeDefined();
		});

		it("должен поддерживать опциональные inject", () => {
			const dynamicModule = RabbitMQModule.forRootAsync({
				useFactory: () => mockModuleOptions,
				inject: [ConfigService],
			});

			expect(dynamicModule).toBeDefined();
		});

		it("должен поддерживать асинхронный useFactory", () => {
			const dynamicModule = RabbitMQModule.forRootAsync({
				useFactory: async () => {
					return Promise.resolve(mockModuleOptions);
				},
			});

			expect(dynamicModule).toBeDefined();
		});

		it("должен вызвать useFactory с переданными аргументами", async () => {
			const mockUseFactory = jest.fn().mockResolvedValue(mockModuleOptions);
			const mockConfigService = {} as ConfigService;
			const mockInjectValue = { test: "value" };

			RabbitMQModule.forRootAsync({
				useFactory: mockUseFactory,
				inject: ["TEST_TOKEN"],
			});

			const clientsModuleCall = (ClientsModule.registerAsync as jest.Mock).mock.calls[0][0];
			const useFactory = clientsModuleCall[0].useFactory;

			expect(useFactory).toBeDefined();
			expect(typeof useFactory).toBe("function");

			const result = await useFactory(mockConfigService, mockInjectValue);

			expect(mockUseFactory).toHaveBeenCalledTimes(1);
			expect(mockUseFactory).toHaveBeenCalledWith(mockConfigService, mockInjectValue);

			expect(mockCreateSenderConfig).toHaveBeenCalledWith(mockModuleOptions);
			expect(result).toEqual({
				transport: mockSenderConfig.transport,
				options: mockSenderConfig.options,
			});
		});

		it("должен использовать ClientsModule.registerAsync с правильной useFactory", async () => {
			RabbitMQModule.forRootAsync({
				useFactory: () => mockModuleOptions,
			});

			expect(ClientsModule.registerAsync).toHaveBeenCalled();
			const clientsModuleCall = (ClientsModule.registerAsync as jest.Mock).mock.calls[0][0];
			expect(clientsModuleCall).toBeDefined();
			expect(clientsModuleCall[0].name).toBe(RABBITMQ_SENDER_SERVICE);
			expect(clientsModuleCall[0].useFactory).toBeDefined();
			expect(clientsModuleCall[0].inject).toEqual([]);

			const useFactory = clientsModuleCall[0].useFactory;
			const result = await useFactory();

			expect(mockCreateSenderConfig).toHaveBeenCalledWith(mockModuleOptions);
			expect(result).toEqual({
				transport: mockSenderConfig.transport,
				options: mockSenderConfig.options,
			});
		});
	});

	describe("конфигурация зависимостей", () => {
		it("должен создать RabbitMQService с правильными зависимостями", () => {
			expect(rabbitMQService).toBeDefined();
			expect(rabbitMQService).toBeInstanceOf(RabbitMQService);
		});

		it("должен зарегистрировать RABBITMQ_SENDER_SERVICE", () => {
			const clientProxy = module.get(RABBITMQ_SENDER_SERVICE);
			expect(clientProxy).toBeDefined();
			expect(clientProxy.connect).toBeDefined();
			expect(clientProxy.close).toBeDefined();
		});
	});

	describe("конфигурация сервиса", () => {
		it("должен загрузить все необходимые конфигурации", () => {
			expect(configService.get("rabbitmqSender")).toEqual(mockModuleOptions);
		});

		it("должен правильно инициализировать RabbitMQService", () => {
			expect(rabbitMQService).toBeDefined();
			expect(rabbitMQService.fireAndForget).toBeDefined();
			expect(rabbitMQService.publish).toBeDefined();
		});
	});

	describe("тестирование функциональности сервиса", () => {
		it("должен правильно работать с конфигурацией", () => {
			const config = configService.get("rabbitmqSender");
			expect(config).toEqual(mockModuleOptions);
			expect(config.url).toBe(mockModuleOptions.url);
			expect(config.exchange).toBe(mockModuleOptions.exchange);
		});

		it("должен использовать createSenderConfig для вычисления конфигурации", () => {
			expect(mockCreateSenderConfig).toHaveBeenCalledWith(mockModuleOptions);
		});
	});

	describe("интеграционные тесты", () => {
		it("должен корректно инициализировать все зависимости", () => {
			const service = module.get<RabbitMQService>(RabbitMQService);
			const config = module.get<ConfigService>(ConfigService);
			const logger = module.get<LoggerService>(LoggerService);
			const clientProxy = module.get(RABBITMQ_SENDER_SERVICE);

			expect(service).toBeDefined();
			expect(config).toBeDefined();
			expect(logger).toBeDefined();
			expect(clientProxy).toBeDefined();
		});

		it("должен работать с мокированной конфигурацией", () => {
			const config = configService.get("rabbitmqSender");
			expect(config).toEqual(mockModuleOptions);
			expect(rabbitMQService).toBeDefined();
		});
	});
});
