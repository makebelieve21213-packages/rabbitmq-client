import { LoggerService } from "@makebelieve21213-packages/logger";
import connectRabbitMQReceiver from "src/connect-rabbitmq-receiver";
import connectRabbitMQReceivers from "src/connect-rabbitmq-receivers";

import type { INestApplication } from "@nestjs/common";
import type RabbitMQReceiverOptions from "src/types/rabbitmq-receiver-options";

jest.mock("src/connect-rabbitmq-receiver");
jest.mock("@makebelieve21213-packages/logger");

const mockConnectRabbitMQReceiver = connectRabbitMQReceiver as jest.MockedFunction<
	typeof connectRabbitMQReceiver
>;

describe("connectRabbitMQReceivers", () => {
	let app: jest.Mocked<INestApplication>;
	let loggerService: jest.Mocked<LoggerService>;
	let receiverOptionsList: RabbitMQReceiverOptions[];

	beforeEach(() => {
		jest.clearAllMocks();

		loggerService = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
			setContext: jest.fn(),
			info: jest.fn(),
		} as unknown as jest.Mocked<LoggerService>;

		app = {
			resolve: jest.fn().mockResolvedValue(loggerService),
		} as unknown as jest.Mocked<INestApplication>;

		receiverOptionsList = [
			{
				url: "amqp://localhost:5672",
				exchange: "test_exchange",
				exchangeType: "topic",
				queue: "test.queue1",
				pattern: "test.*",
			},
			{
				url: "amqp://localhost:5672",
				exchange: "test_exchange",
				exchangeType: "topic",
				queue: "test.queue2",
				pattern: "test.*",
			},
			{
				url: "amqp://localhost:5672",
				exchange: "test_exchange",
				exchangeType: "topic",
				queue: "test.queue3",
				pattern: "test.*",
			},
		];

		mockConnectRabbitMQReceiver.mockResolvedValue(undefined);
	});

	describe("базовая функциональность", () => {
		it("должен вызвать connectRabbitMQReceiver для каждой подписки", async () => {
			await connectRabbitMQReceivers(app, receiverOptionsList);

			expect(mockConnectRabbitMQReceiver).toHaveBeenCalledTimes(receiverOptionsList.length);
		});

		it("должен передать правильные опции для каждой подписки", async () => {
			await connectRabbitMQReceivers(app, receiverOptionsList);

			receiverOptionsList.forEach((options, index) => {
				expect(mockConnectRabbitMQReceiver).toHaveBeenNthCalledWith(
					index + 1,
					app,
					options,
					index !== 0
				);
			});
		});

		it("должен разрешить LoggerService из приложения", async () => {
			await connectRabbitMQReceivers(app, receiverOptionsList);

			expect(app.resolve).toHaveBeenCalledWith(LoggerService);
		});

		it("должен залогировать подключение каждой подписки", async () => {
			await connectRabbitMQReceivers(app, receiverOptionsList);

			receiverOptionsList.forEach((options) => {
				expect(loggerService.log).toHaveBeenCalledWith(
					`RabbitMQ subscription connected [queue: ${options.queue}, pattern: ${options.pattern}, exchange: ${options.exchange}, exchangeType: ${options.exchangeType}]`
				);
			});
		});

		it("должен залогировать общее количество подключенных подписок", async () => {
			await connectRabbitMQReceivers(app, receiverOptionsList);

			expect(loggerService.log).toHaveBeenCalledWith(
				`All RabbitMQ subscriptions connected [count: ${receiverOptionsList.length}]`
			);
		});
	});

	describe("skipGlobalSetup параметр", () => {
		it("должен передать skipGlobalSetup = false для первой подписки", async () => {
			await connectRabbitMQReceivers(app, receiverOptionsList);

			expect(mockConnectRabbitMQReceiver).toHaveBeenNthCalledWith(
				1,
				app,
				receiverOptionsList[0],
				false
			);
		});

		it("должен передать skipGlobalSetup = true для последующих подписок", async () => {
			await connectRabbitMQReceivers(app, receiverOptionsList);

			expect(mockConnectRabbitMQReceiver).toHaveBeenNthCalledWith(
				2,
				app,
				receiverOptionsList[1],
				true
			);

			expect(mockConnectRabbitMQReceiver).toHaveBeenNthCalledWith(
				3,
				app,
				receiverOptionsList[2],
				true
			);
		});
	});

	describe("порядок вызовов", () => {
		it("должен вызывать connectRabbitMQReceiver последовательно", async () => {
			await connectRabbitMQReceivers(app, receiverOptionsList);

			const callOrder = mockConnectRabbitMQReceiver.mock.invocationCallOrder;

			expect(callOrder[0]).toBeLessThan(callOrder[1]);
			expect(callOrder[1]).toBeLessThan(callOrder[2]);
		});

		it("должен логировать каждую подписку после её подключения", async () => {
			await connectRabbitMQReceivers(app, receiverOptionsList);

			const logCalls = (loggerService.log as jest.Mock).mock.calls;

			expect(logCalls[0][0]).toContain(receiverOptionsList[0].queue);
			expect(logCalls[1][0]).toContain(receiverOptionsList[1].queue);
			expect(logCalls[2][0]).toContain(receiverOptionsList[2].queue);
			expect(logCalls[3][0]).toContain(`All RabbitMQ subscriptions connected`);
		});
	});

	describe("крайние случаи", () => {
		it("должен корректно обработать пустой массив подписок", async () => {
			await connectRabbitMQReceivers(app, []);

			expect(mockConnectRabbitMQReceiver).not.toHaveBeenCalled();
			expect(loggerService.log).toHaveBeenCalledWith(
				`All RabbitMQ subscriptions connected [count: 0]`
			);
		});

		it("должен корректно обработать одну подписку", async () => {
			const singleSubscription = [receiverOptionsList[0]];

			await connectRabbitMQReceivers(app, singleSubscription);

			expect(mockConnectRabbitMQReceiver).toHaveBeenCalledTimes(1);
			expect(mockConnectRabbitMQReceiver).toHaveBeenCalledWith(app, singleSubscription[0], false);
			expect(loggerService.log).toHaveBeenCalledWith(
				`All RabbitMQ subscriptions connected [count: 1]`
			);
		});

		it("должен обработать ошибку при подключении подписки", async () => {
			const error = new Error("Connection failed");
			mockConnectRabbitMQReceiver.mockRejectedValueOnce(error);

			await expect(connectRabbitMQReceivers(app, receiverOptionsList)).rejects.toThrow(
				"Connection failed"
			);

			expect(mockConnectRabbitMQReceiver).toHaveBeenCalledTimes(1);
		});
	});

	describe("логирование", () => {
		it("должен логировать правильное количество подписок", async () => {
			await connectRabbitMQReceivers(app, receiverOptionsList);

			const finalLogCall = (loggerService.log as jest.Mock).mock.calls.find((call) =>
				call[0].includes("All RabbitMQ subscriptions connected")
			);

			expect(finalLogCall).toBeDefined();
			expect(finalLogCall[0]).toContain(`count: ${receiverOptionsList.length}`);
		});

		it("должен логировать все параметры подписки", async () => {
			const options = receiverOptionsList[0];

			await connectRabbitMQReceivers(app, [options]);

			expect(loggerService.log).toHaveBeenCalledWith(
				expect.stringContaining(`queue: ${options.queue}`)
			);
			expect(loggerService.log).toHaveBeenCalledWith(
				expect.stringContaining(`pattern: ${options.pattern}`)
			);
			expect(loggerService.log).toHaveBeenCalledWith(
				expect.stringContaining(`exchange: ${options.exchange}`)
			);
			expect(loggerService.log).toHaveBeenCalledWith(
				expect.stringContaining(`exchangeType: ${options.exchangeType}`)
			);
		});
	});
});
