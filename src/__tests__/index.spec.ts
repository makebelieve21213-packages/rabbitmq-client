// Импортируем из главного index.ts файла для покрытия экспортов
import {
	createDLXConfig as OriginalCreateDLXConfig,
	createReceiverConfig as OriginalCreateReceiverConfig,
	createRetryConfig as OriginalCreateRetryConfig,
} from "src/config/factories";
import OriginalConnectRabbitMQReceiver from "src/connect-rabbitmq-receiver";
import OriginalConnectRabbitMQReceivers from "src/connect-rabbitmq-receivers";
import {
	RabbitMQIdempotencyInterceptor,
	RabbitMQModule,
	RabbitMQService,
	connectRabbitMQReceiver,
	connectRabbitMQReceivers,
	createDLXConfig,
	createReceiverConfig,
	createRetryConfig,
	type RabbitMQModuleOptions,
	type RabbitMQSenderOptions,
	type RabbitMQReceiverOptions,
	type RabbitMQReceiverSubscription,
	type RabbitMQReceiversConfig,
	type IdempotentMessage,
} from "src/index";
import OriginalRabbitMQIdempotencyInterceptor from "src/interceptors/rabbitmq.interceptor";
import OriginalRabbitMQModule from "src/main/rabbitmq.module";
import OriginalRabbitMQService from "src/main/rabbitmq.service";

describe("Index экспорты", () => {
	it("должен экспортировать RabbitMQModule", () => {
		expect(RabbitMQModule).toBeDefined();
		expect(typeof RabbitMQModule).toBe("function");
		expect(RabbitMQModule).toBe(OriginalRabbitMQModule);
	});

	it("должен экспортировать RabbitMQService", () => {
		expect(RabbitMQService).toBeDefined();
		expect(typeof RabbitMQService).toBe("function");
		expect(RabbitMQService).toBe(OriginalRabbitMQService);
	});

	it("должен экспортировать connectRabbitMQReceiver", () => {
		expect(connectRabbitMQReceiver).toBeDefined();
		expect(typeof connectRabbitMQReceiver).toBe("function");
		expect(connectRabbitMQReceiver).toBe(OriginalConnectRabbitMQReceiver);
	});

	it("должен экспортировать connectRabbitMQReceivers", () => {
		expect(connectRabbitMQReceivers).toBeDefined();
		expect(typeof connectRabbitMQReceivers).toBe("function");
		expect(connectRabbitMQReceivers).toBe(OriginalConnectRabbitMQReceivers);
	});

	it("должен экспортировать RabbitMQIdempotencyInterceptor", () => {
		expect(RabbitMQIdempotencyInterceptor).toBeDefined();
		expect(typeof RabbitMQIdempotencyInterceptor).toBe("function");
		expect(RabbitMQIdempotencyInterceptor).toBe(OriginalRabbitMQIdempotencyInterceptor);
	});

	it("должен экспортировать createDLXConfig", () => {
		expect(createDLXConfig).toBeDefined();
		expect(typeof createDLXConfig).toBe("function");
		expect(createDLXConfig).toBe(OriginalCreateDLXConfig);
	});

	it("должен экспортировать createReceiverConfig", () => {
		expect(createReceiverConfig).toBeDefined();
		expect(typeof createReceiverConfig).toBe("function");
		expect(createReceiverConfig).toBe(OriginalCreateReceiverConfig);
	});

	it("должен экспортировать createRetryConfig", () => {
		expect(createRetryConfig).toBeDefined();
		expect(typeof createRetryConfig).toBe("function");
		expect(createRetryConfig).toBe(OriginalCreateRetryConfig);
	});

	it("должен экспортировать все основные компоненты пакета", () => {
		// Проверяем, что все основные экспорты доступны
		const exports = {
			RabbitMQModule,
			RabbitMQService,
			connectRabbitMQReceiver,
			connectRabbitMQReceivers,
			RabbitMQIdempotencyInterceptor,
			createDLXConfig,
			createReceiverConfig,
			createRetryConfig,
		};

		expect(Object.keys(exports)).toHaveLength(8);
		Object.values(exports).forEach((exportedItem) => {
			expect(exportedItem).toBeDefined();
			expect(typeof exportedItem).toBe("function");
		});
	});

	it("экспорты должны быть корректными функциями-конструкторами", () => {
		// RabbitMQModule должен быть декорированным классом
		expect(RabbitMQModule).toHaveProperty("name");
		expect(RabbitMQModule.name).toBe("RabbitMQModule");

		// RabbitMQService должен быть классом
		expect(RabbitMQService).toHaveProperty("name");
		expect(RabbitMQService.name).toBe("RabbitMQService");

		// connectRabbitMQReceiver должен быть функцией
		expect(connectRabbitMQReceiver).toHaveProperty("name");
		expect(connectRabbitMQReceiver.name).toBe("connectRabbitMQReceiver");

		// connectRabbitMQReceivers должен быть функцией
		expect(connectRabbitMQReceivers).toHaveProperty("name");
		expect(connectRabbitMQReceivers.name).toBe("connectRabbitMQReceivers");

		// RabbitMQIdempotencyInterceptor должен быть классом
		expect(RabbitMQIdempotencyInterceptor).toHaveProperty("name");
		expect(RabbitMQIdempotencyInterceptor.name).toBe("RabbitMQIdempotencyInterceptor");

		// Функции создания конфигураций должны быть функциями
		expect(createDLXConfig).toHaveProperty("name");
		expect(createDLXConfig.name).toBe("createDLXConfig");

		expect(createReceiverConfig).toHaveProperty("name");
		expect(createReceiverConfig.name).toBe("createReceiverConfig");

		expect(createRetryConfig).toHaveProperty("name");
		expect(createRetryConfig.name).toBe("createRetryConfig");
	});

	it("должен обеспечивать правильную структуру API пакета", () => {
		// Проверяем, что экспорты соответствуют ожидаемому API
		expect(() => {
			// Эти вызовы не должны выбрасывать ошибки на уровне импорта
			const moduleClass = RabbitMQModule;
			const serviceClass = RabbitMQService;
			const connectFunction = connectRabbitMQReceiver;
			const connectReceiversFunction = connectRabbitMQReceivers;
			const interceptorClass = RabbitMQIdempotencyInterceptor;
			const dlxConfigFunction = createDLXConfig;
			const receiverConfigFunction = createReceiverConfig;
			const retryConfigFunction = createRetryConfig;

			expect(moduleClass).toBeTruthy();
			expect(serviceClass).toBeTruthy();
			expect(connectFunction).toBeTruthy();
			expect(connectReceiversFunction).toBeTruthy();
			expect(interceptorClass).toBeTruthy();
			expect(dlxConfigFunction).toBeTruthy();
			expect(receiverConfigFunction).toBeTruthy();
			expect(retryConfigFunction).toBeTruthy();
		}).not.toThrow();
	});

	it("должен экспортировать тип RabbitMQModuleOptions", () => {
		// Проверяем, что тип доступен для использования
		const testOptions: RabbitMQModuleOptions = {
			url: "amqp://localhost:5672",
			exchange: "test_exchange",
			exchangeType: "topic",
			queue: "q.test",
			pattern: "test.*",
		};

		expect(testOptions).toBeDefined();
		expect(testOptions.url).toBe("amqp://localhost:5672");
		expect(testOptions.exchange).toBe("test_exchange");
	});

	it("должен экспортировать тип RabbitMQSenderOptions", () => {
		const testOptions: RabbitMQSenderOptions = {
			url: "amqp://localhost:5672",
			exchange: "test_exchange",
			exchangeType: "topic",
		};

		expect(testOptions).toBeDefined();
		expect(testOptions.url).toBe("amqp://localhost:5672");
		expect(testOptions.exchange).toBe("test_exchange");
	});

	it("должен экспортировать тип RabbitMQReceiverOptions", () => {
		const testOptions: RabbitMQReceiverOptions = {
			url: "amqp://localhost:5672",
			exchange: "test_exchange",
			exchangeType: "topic",
			queue: "test.queue",
			pattern: "test.*",
		};

		expect(testOptions).toBeDefined();
		expect(testOptions.url).toBe("amqp://localhost:5672");
		expect(testOptions.queue).toBe("test.queue");
		expect(testOptions.pattern).toBe("test.*");
	});

	it("должен экспортировать тип RabbitMQReceiverSubscription", () => {
		const testSubscription: RabbitMQReceiverSubscription = {
			name: "test-subscription",
			queue: "test.queue",
			pattern: "test.*",
		};

		expect(testSubscription).toBeDefined();
		expect(testSubscription.name).toBe("test-subscription");
		expect(testSubscription.queue).toBe("test.queue");
		expect(testSubscription.pattern).toBe("test.*");
	});

	it("должен экспортировать тип RabbitMQReceiversConfig", () => {
		const testConfig: RabbitMQReceiversConfig = {
			url: "amqp://localhost:5672",
			exchange: "test_exchange",
			exchangeType: "topic",
			subscriptions: [
				{
					name: "test-subscription",
					queue: "test.queue1",
					pattern: "test.*",
				},
			],
		};

		expect(testConfig).toBeDefined();
		expect(testConfig.url).toBe("amqp://localhost:5672");
		expect(testConfig.subscriptions).toHaveLength(1);
	});

	it("должен экспортировать тип IdempotentMessage", () => {
		const testMessage: IdempotentMessage<string> = {
			id: "test-id",
			timestamp: Date.now(),
			data: "test",
		};

		expect(testMessage).toBeDefined();
		expect(testMessage.id).toBe("test-id");
		expect(testMessage.timestamp).toBeGreaterThan(0);
		expect(testMessage.data).toBe("test");
	});

	it("должен экспортировать все компоненты пакета включая интерцептор и функции конфигурации", () => {
		const allExports = {
			RabbitMQModule,
			RabbitMQService,
			connectRabbitMQReceiver,
			connectRabbitMQReceivers,
			RabbitMQIdempotencyInterceptor,
			createDLXConfig,
			createReceiverConfig,
			createRetryConfig,
		};

		Object.values(allExports).forEach((exportedItem) => {
			expect(exportedItem).toBeDefined();
			expect(typeof exportedItem).toBe("function");
		});
	});
});
