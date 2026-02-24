import { DISCONNECTED_RMQ_MESSAGE } from "@nestjs/microservices/constants";
import { connect as mockConnect } from "amqp-connection-manager";
import CustomServerRMQ from "src/server/custom-server-rmq";

import type { Subject } from "rxjs";

describe("CustomServerRMQ", () => {
	const defaultOptions = {
		urls: ["amqp://localhost"],
		queue: "test_queue",
	};

	let mockServer: { on: jest.Mock; createChannel: jest.Mock };
	let mockChannel: Record<string, jest.Mock>;
	let statusSubject: Subject<string>;
	let logger: { error: jest.Mock };

	beforeEach(() => {
		jest.clearAllMocks();

		statusSubject = {
			next: jest.fn(),
		} as unknown as Subject<string>;

		logger = {
			error: jest.fn(),
		};

		mockChannel = {
			assertQueue: jest.fn().mockResolvedValue(undefined),
			assertExchange: jest.fn().mockResolvedValue(undefined),
			bindQueue: jest.fn().mockResolvedValue(undefined),
			prefetch: jest.fn().mockResolvedValue(undefined),
			consume: jest.fn().mockReturnValue(undefined),
		};

		mockServer = {
			on: jest.fn(),
			createChannel: jest
				.fn()
				.mockImplementation((opts: { setup: (ch: typeof mockChannel) => void }) => {
					opts.setup(mockChannel);
					return {};
				}),
		};

		(mockConnect as jest.Mock).mockReturnValue(mockServer);
	});

	describe("constructor", () => {
		it("должен создавать экземпляр с переданными options", () => {
			const server = new CustomServerRMQ(defaultOptions);
			expect(server).toBeInstanceOf(CustomServerRMQ);
		});
	});

	describe("registerDisconnectListener", () => {
		it("должен регистрировать listener на disconnect с улучшенным логированием для Error", () => {
			const server = new CustomServerRMQ(defaultOptions);
			(
				server as unknown as {
					server: typeof mockServer;
					_status$: typeof statusSubject;
					logger: typeof logger;
				}
			).server = mockServer;
			(server as unknown as { _status$: typeof statusSubject })._status$ = statusSubject;
			(server as unknown as { logger: typeof logger }).logger = logger;

			const registerDisconnectListener = (
				CustomServerRMQ.prototype as unknown as { registerDisconnectListener(): void }
			).registerDisconnectListener;
			registerDisconnectListener.call(server);

			expect(mockServer.on).toHaveBeenCalledWith("disconnect", expect.any(Function));
			const disconnectCallback = mockServer.on.mock.calls[0][1];

			const err = new Error("Connection lost");
			disconnectCallback(err);

			expect(statusSubject.next).toHaveBeenCalledWith("disconnected");
			expect(logger.error).toHaveBeenCalledWith(DISCONNECTED_RMQ_MESSAGE);
			expect(logger.error).toHaveBeenCalledWith("Connection lost");
		});

		it("должен логировать строковую ошибку", () => {
			const server = new CustomServerRMQ(defaultOptions);
			(server as unknown as { server: typeof mockServer }).server = mockServer;
			(server as unknown as { _status$: typeof statusSubject })._status$ = statusSubject;
			(server as unknown as { logger: typeof logger }).logger = logger;

			const registerDisconnectListener = (
				CustomServerRMQ.prototype as unknown as { registerDisconnectListener(): void }
			).registerDisconnectListener;
			registerDisconnectListener.call(server);

			const disconnectCallback = mockServer.on.mock.calls[0][1];
			disconnectCallback("Network timeout");

			expect(logger.error).toHaveBeenCalledWith("Network timeout");
		});

		it("должен логировать объект через JSON.stringify", () => {
			const server = new CustomServerRMQ(defaultOptions);
			(server as unknown as { server: typeof mockServer }).server = mockServer;
			(server as unknown as { _status$: typeof statusSubject })._status$ = statusSubject;
			(server as unknown as { logger: typeof logger }).logger = logger;

			const registerDisconnectListener = (
				CustomServerRMQ.prototype as unknown as { registerDisconnectListener(): void }
			).registerDisconnectListener;
			registerDisconnectListener.call(server);

			const disconnectCallback = mockServer.on.mock.calls[0][1];
			disconnectCallback({ code: "ECONNREFUSED", errno: -61 });

			expect(logger.error).toHaveBeenCalledWith('{"code":"ECONNREFUSED","errno":-61}');
		});

		it("должен использовать String(err) для несериализуемых объектов", () => {
			const server = new CustomServerRMQ(defaultOptions);
			(server as unknown as { server: typeof mockServer }).server = mockServer;
			(server as unknown as { _status$: typeof statusSubject })._status$ = statusSubject;
			(server as unknown as { logger: typeof logger }).logger = logger;

			const registerDisconnectListener = (
				CustomServerRMQ.prototype as unknown as { registerDisconnectListener(): void }
			).registerDisconnectListener;
			registerDisconnectListener.call(server);

			const circular: Record<string, unknown> = {};
			circular.self = circular;
			const disconnectCallback = mockServer.on.mock.calls[0][1];
			disconnectCallback(circular);

			expect(logger.error).toHaveBeenCalledWith(DISCONNECTED_RMQ_MESSAGE);
			expect(logger.error).toHaveBeenLastCalledWith("[object Object]");
		});
	});

	describe("setupChannel", () => {
		it("должен вызывать assertQueue с this.queue когда noAssert=false", async () => {
			const server = new CustomServerRMQ(defaultOptions);
			const callback = jest.fn();

			await server.setupChannel(mockChannel, callback);

			expect(mockChannel.assertQueue).toHaveBeenCalledWith("test_queue", expect.any(Object));
			expect(mockChannel.consume).toHaveBeenCalledWith(
				"test_queue",
				expect.any(Function),
				expect.any(Object)
			);
			expect(callback).toHaveBeenCalled();
		});

		it("не должен вызывать assertQueue когда noAssert=true", async () => {
			const server = new CustomServerRMQ({
				...defaultOptions,
				noAssert: true,
			});
			const callback = jest.fn();

			await server.setupChannel(mockChannel, callback);

			expect(mockChannel.assertQueue).not.toHaveBeenCalled();
			expect(mockChannel.consume).toHaveBeenCalledWith(
				"test_queue",
				expect.any(Function),
				expect.any(Object)
			);
		});

		it("должен использовать options.pattern для routing keys при wildcards=true", async () => {
			const server = new CustomServerRMQ({
				...defaultOptions,
				exchange: "test_exchange",
				wildcards: true,
				pattern: "key.a, key.b, key.c",
			} as ConstructorParameters<typeof CustomServerRMQ>[0]);
			const callback = jest.fn();

			await server.setupChannel(mockChannel, callback);

			expect(mockChannel.assertExchange).toHaveBeenCalledWith(
				"test_exchange",
				"topic",
				expect.any(Object)
			);
			expect(mockChannel.bindQueue).toHaveBeenCalledTimes(3);
			expect(mockChannel.bindQueue).toHaveBeenCalledWith("test_queue", "test_exchange", "key.a");
			expect(mockChannel.bindQueue).toHaveBeenCalledWith("test_queue", "test_exchange", "key.b");
			expect(mockChannel.bindQueue).toHaveBeenCalledWith("test_queue", "test_exchange", "key.c");
			expect(callback).toHaveBeenCalled();
		});

		it("должен использовать getHandlers().keys() когда wildcards=true и pattern не задан (строка 71)", async () => {
			const server = new CustomServerRMQ({
				...defaultOptions,
				exchange: "test_exchange",
				wildcards: true,
			} as ConstructorParameters<typeof CustomServerRMQ>[0]);
			const callback = jest.fn();

			const handlerKeys = ["handler.a", "handler.b"];
			(server as unknown as { getHandlers(): Map<string, unknown> }).getHandlers = jest
				.fn()
				.mockReturnValue(new Map(handlerKeys.map((k) => [k, jest.fn()])));

			await server.setupChannel(mockChannel, callback);

			expect(mockChannel.assertExchange).toHaveBeenCalledWith(
				"test_exchange",
				"topic",
				expect.any(Object)
			);
			expect(mockChannel.bindQueue).toHaveBeenCalledTimes(2);
			expect(mockChannel.bindQueue).toHaveBeenCalledWith("test_queue", "test_exchange", "handler.a");
			expect(mockChannel.bindQueue).toHaveBeenCalledWith("test_queue", "test_exchange", "handler.b");
			expect(callback).toHaveBeenCalled();
		});

		it("должен биндить routingKey когда options.routingKey задан", async () => {
			const server = new CustomServerRMQ({
				...defaultOptions,
				exchange: "test_exchange",
				routingKey: "events.orders",
			} as ConstructorParameters<typeof CustomServerRMQ>[0]);
			const callback = jest.fn();

			await server.setupChannel(mockChannel, callback);

			expect(mockChannel.bindQueue).toHaveBeenCalledWith(
				"test_queue",
				"test_exchange",
				"events.orders"
			);
		});

		it("должен вызывать prefetch и consume", async () => {
			const server = new CustomServerRMQ(defaultOptions);
			const callback = jest.fn();

			await server.setupChannel(mockChannel, callback);

			expect(mockChannel.prefetch).toHaveBeenCalled();
			expect(mockChannel.consume).toHaveBeenCalledWith(
				"test_queue",
				expect.any(Function),
				expect.objectContaining({
					noAck: expect.any(Boolean),
				})
			);
			expect(callback).toHaveBeenCalled();
		});

		it("должен передать consumerTag в consume при options.consumerTag (строка 85)", async () => {
			const server = new CustomServerRMQ({
				...defaultOptions,
				consumerTag: "my-consumer-tag",
			} as ConstructorParameters<typeof CustomServerRMQ>[0]);
			const callback = jest.fn();

			await server.setupChannel(mockChannel, callback);

			expect(mockChannel.consume).toHaveBeenCalledWith(
				"test_queue",
				expect.any(Function),
				expect.objectContaining({
					noAck: expect.any(Boolean),
					consumerTag: "my-consumer-tag",
				})
			);
			expect(callback).toHaveBeenCalled();
		});

		it("должен вызывать handleMessage при получении сообщения через consume callback", async () => {
			const server = new CustomServerRMQ(defaultOptions);
			const callback = jest.fn();
			const handleMessageSpy = jest.spyOn(server, "handleMessage").mockResolvedValue(undefined);

			await server.setupChannel(mockChannel, callback);

			const consumeHandler = mockChannel.consume.mock.calls[0][1];
			const mockMessage = { content: Buffer.from("test") };
			await consumeHandler(mockMessage);

			expect(handleMessageSpy).toHaveBeenCalledWith(mockMessage, mockChannel);

			handleMessageSpy.mockRestore();
		});
	});
});
