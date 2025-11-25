import { LoggerService } from "@makebelieve21213-packages/logger";
import { of, throwError } from "rxjs";
import RabbitMQIdempotencyInterceptor from "src/interceptors/rabbitmq.interceptor";

import type { RedisClientService } from "@makebelieve21213-packages/redis-client";
import type { ExecutionContext, CallHandler } from "@nestjs/common";
import type { RmqContext } from "@nestjs/microservices";

jest.mock("@makebelieve21213-packages/logger", () => ({
	LoggerService: jest.fn().mockImplementation(() => ({
		log: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		debug: jest.fn(),
		setContext: jest.fn(),
	})),
}));

describe("RabbitMQIdempotencyInterceptor", () => {
	let interceptor: RabbitMQIdempotencyInterceptor;
	let redisService: jest.Mocked<RedisClientService>;
	let mockLoggerInstance: jest.Mocked<LoggerService>;
	let executionContext: jest.Mocked<ExecutionContext>;
	let callHandler: jest.Mocked<CallHandler>;

	const correlationId = "test-correlation-id-123";
	const correlationTimestamp = Date.now();
	const redisKey = `rabbitmq:idempotency:${correlationId}`;

	beforeEach(() => {
		redisService = {
			get: jest.fn(),
			set: jest.fn(),
			del: jest.fn(),
		} as unknown as jest.Mocked<RedisClientService>;

		mockLoggerInstance = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
			setContext: jest.fn(),
		} as unknown as jest.Mocked<LoggerService>;

		(LoggerService as jest.Mock).mockImplementation(() => mockLoggerInstance);

		interceptor = new RabbitMQIdempotencyInterceptor(redisService, mockLoggerInstance);

		executionContext = {
			getType: jest.fn(),
			getArgByIndex: jest.fn(),
			switchToRpc: jest.fn(),
		} as unknown as jest.Mocked<ExecutionContext>;

		callHandler = {
			handle: jest.fn(),
		} as unknown as jest.Mocked<CallHandler>;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("constructor", () => {
		it("должен инициализировать интерцептор с redisService и установить контекст логгера", (done) => {
			const testRedisService = {
				get: jest.fn(),
				set: jest.fn(),
				del: jest.fn(),
			} as unknown as jest.Mocked<RedisClientService>;

			const testLoggerInstance = {
				log: jest.fn(),
				error: jest.fn(),
				warn: jest.fn(),
				debug: jest.fn(),
				setContext: jest.fn(),
			} as unknown as jest.Mocked<LoggerService>;

			(LoggerService as jest.Mock).mockImplementation(() => testLoggerInstance);

			const testInterceptor = new RabbitMQIdempotencyInterceptor(testRedisService, testLoggerInstance);

			expect(testInterceptor).toBeInstanceOf(RabbitMQIdempotencyInterceptor);
			expect(testLoggerInstance.setContext).toHaveBeenCalledWith("RabbitMQIdempotencyInterceptor");

			// Проверяем, что redisService действительно используется через вызов intercept
			const testExecutionContext = {
				getType: jest.fn().mockReturnValue("rpc"),
				getArgByIndex: jest.fn().mockReturnValue({
					correlationId: "test-id",
					correlationTimestamp: Date.now(),
					data: "test",
				}),
				switchToRpc: jest.fn(),
			} as unknown as jest.Mocked<ExecutionContext>;

			const testCallHandler = {
				handle: jest.fn().mockReturnValue(of({ result: "success" })),
			} as unknown as jest.Mocked<CallHandler>;

			testRedisService.get.mockResolvedValue(null);
			testRedisService.set.mockResolvedValue(undefined);

			const result = testInterceptor.intercept(testExecutionContext, testCallHandler);

			result.subscribe({
				next: () => {
					expect(testRedisService.get).toHaveBeenCalled();
					done();
				},
				error: (err) => {
					done(err);
				},
			});
		});
	});

	describe("intercept", () => {
		it("должен пропустить обработку, если контекст не RPC", (done) => {
			executionContext.getType.mockReturnValue("http");
			callHandler.handle.mockReturnValue(of({ result: "success" }));

			const result = interceptor.intercept(executionContext, callHandler);

			result.subscribe({
				next: (value) => {
					expect(value).toEqual({ result: "success" });
					expect(redisService.get).not.toHaveBeenCalled();
					expect(callHandler.handle).toHaveBeenCalledTimes(1);
					done();
				},
			});
		});

		it("должен пропустить обработку, если в сообщении нет correlationId", (done) => {
			executionContext.getType.mockReturnValue("rpc");
			executionContext.getArgByIndex.mockReturnValue({ data: "test" });
			callHandler.handle.mockReturnValue(of({ result: "success" }));

			const result = interceptor.intercept(executionContext, callHandler);

			result.subscribe({
				next: (value) => {
					expect(value).toEqual({ result: "success" });
					expect(redisService.get).not.toHaveBeenCalled();
					expect(callHandler.handle).toHaveBeenCalledTimes(1);
					done();
				},
			});
		});

		it("должен пропустить обработку, если correlationId не является строкой", (done) => {
			executionContext.getType.mockReturnValue("rpc");
			executionContext.getArgByIndex.mockReturnValue({
				correlationId: 123,
			});
			callHandler.handle.mockReturnValue(of({ result: "success" }));

			const result = interceptor.intercept(executionContext, callHandler);

			result.subscribe({
				next: (value) => {
					expect(value).toEqual({ result: "success" });
					expect(redisService.get).not.toHaveBeenCalled();
					expect(callHandler.handle).toHaveBeenCalledTimes(1);
					done();
				},
			});
		});

		it("должен обработать дубликат сообщения и вернуть ответ без обработки", (done) => {
			const message = {
				correlationId,
				correlationTimestamp,
				data: "test",
			};

			const ackFn = jest.fn();
			const rmqContext = {
				getChannelRef: jest.fn().mockReturnValue({
					ack: ackFn,
				}),
				getMessage: jest.fn().mockReturnValue({}),
			} as unknown as RmqContext;

			executionContext.getType.mockReturnValue("rpc");
			executionContext.getArgByIndex.mockReturnValue(message);
			executionContext.switchToRpc = jest.fn().mockReturnValue({
				getContext: jest.fn().mockReturnValue(rmqContext),
			});
			redisService.get.mockResolvedValue(String(correlationTimestamp));

			const result = interceptor.intercept(executionContext, callHandler);

			result.subscribe({
				next: (value) => {
					expect(value).toEqual({
						duplicate: true,
						correlationId,
					});
					expect(redisService.get).toHaveBeenCalledWith(redisKey);
					expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
						expect.stringContaining(
							`Duplicate message detected and skipped [correlationId=${correlationId}`
						)
					);
					expect(callHandler.handle).not.toHaveBeenCalled();
					expect(ackFn).toHaveBeenCalled();
					done();
				},
				error: (err) => {
					done(err);
				},
			});
		});

		it("должен обработать новое сообщение и сохранить его в Redis", (done) => {
			const message = {
				correlationId,
				correlationTimestamp,
				data: "test",
			};

			executionContext.getType.mockReturnValue("rpc");
			executionContext.getArgByIndex.mockReturnValue(message);
			redisService.get.mockResolvedValue(null);
			redisService.set.mockResolvedValue(undefined);
			callHandler.handle.mockReturnValue(of({ result: "success" }));

			const result = interceptor.intercept(executionContext, callHandler);

			result.subscribe({
				next: (value) => {
					expect(value).toEqual({ result: "success" });
					expect(redisService.get).toHaveBeenCalledWith(redisKey);
					expect(redisService.set).toHaveBeenCalledWith(
						redisKey,
						String(correlationTimestamp),
						24 * 60 * 60
					);
					expect(callHandler.handle).toHaveBeenCalledTimes(1);
					expect(mockLoggerInstance.log).toHaveBeenCalledWith(
						expect.stringContaining(`Message processed successfully [correlationId=${correlationId}]`)
					);
					done();
				},
				error: (err) => {
					done(err);
				},
			});
		});

		it("должен удалить ключ из Redis при ошибке обработки сообщения", (done) => {
			const message = {
				correlationId,
				correlationTimestamp,
				data: "test",
			};
			const error = new Error("Processing error");

			executionContext.getType.mockReturnValue("rpc");
			executionContext.getArgByIndex.mockReturnValue(message);
			redisService.get.mockResolvedValue(null);
			redisService.set.mockResolvedValue(undefined);
			redisService.del.mockResolvedValue(1);
			callHandler.handle.mockReturnValue(throwError(() => error));

			const result = interceptor.intercept(executionContext, callHandler);

			result.subscribe({
				error: (err) => {
					expect(err).toBe(error);
					expect(redisService.del).toHaveBeenCalledWith(redisKey);
					done();
				},
			});
		});

		it("должен логировать ошибку при неудачном удалении ключа из Redis", (done) => {
			const message = {
				correlationId,
				correlationTimestamp,
				data: "test",
			};
			const error = new Error("Processing error");
			const delError = new Error("Delete error");

			executionContext.getType.mockReturnValue("rpc");
			executionContext.getArgByIndex.mockReturnValue(message);
			redisService.get.mockResolvedValue(null);
			redisService.set.mockResolvedValue(undefined);
			redisService.del.mockRejectedValue(delError);
			callHandler.handle.mockReturnValue(throwError(() => error));

			const result = interceptor.intercept(executionContext, callHandler);

			result.subscribe({
				error: (err) => {
					expect(err).toBe(error);
					expect(redisService.del).toHaveBeenCalledWith(redisKey);
					setTimeout(() => {
						expect(mockLoggerInstance.error).toHaveBeenCalledWith(
							expect.stringContaining(`Failed to delete idempotency key [correlationId=${correlationId}]`)
						);
						done();
					}, 100);
				},
			});
		});

		it("должен продолжить обработку при ошибке проверки идемпотентности", (done) => {
			const message = {
				correlationId,
				correlationTimestamp,
				data: "test",
			};
			const redisError = new Error("Redis error");

			executionContext.getType.mockReturnValue("rpc");
			executionContext.getArgByIndex.mockReturnValue(message);
			redisService.get.mockRejectedValue(redisError);
			callHandler.handle.mockReturnValue(of({ result: "success" }));

			const result = interceptor.intercept(executionContext, callHandler);

			result.subscribe({
				next: (value) => {
					expect(value).toEqual({ result: "success" });
					expect(mockLoggerInstance.error).toHaveBeenCalledWith(
						expect.stringContaining(`Failed to check idempotency [correlationId=${correlationId}]`)
					);
					expect(callHandler.handle).toHaveBeenCalledTimes(1);
					done();
				},
				error: (err) => {
					done(err);
				},
			});
		});

		it("должен использовать 'unknown' как correlationId при ошибке Redis, если data не имеет correlationId в момент обработки ошибки", (done) => {
			// Создаем объект с correlationId, который проходит проверку hasCorrelationId
			// Но используем Proxy, чтобы при обращении к correlationId в catchError он возвращал undefined
			let correlationIdAccessCount = 0;
			const message = new Proxy(
				{
					correlationId,
					correlationTimestamp,
					data: "test",
				},
				{
					get(target, prop) {
						// При первом обращении (в hasCorrelationId) возвращаем correlationId
						// При втором обращении (в catchError) возвращаем undefined
						if (prop === "correlationId") {
							correlationIdAccessCount++;
							if (correlationIdAccessCount > 1) {
								return undefined;
							}
						}
						return target[prop as keyof typeof target];
					},
				}
			);
			const redisError = new Error("Redis error");

			executionContext.getType.mockReturnValue("rpc");
			executionContext.getArgByIndex.mockReturnValue(message);
			redisService.get.mockRejectedValue(redisError);
			callHandler.handle.mockReturnValue(of({ result: "success" }));

			const result = interceptor.intercept(executionContext, callHandler);

			result.subscribe({
				next: (value) => {
					expect(value).toEqual({ result: "success" });
					// Проверяем, что ошибка была залогирована с "unknown"
					expect(mockLoggerInstance.error).toHaveBeenCalledWith(
						expect.stringContaining(`Failed to check idempotency [correlationId=unknown]`)
					);
					expect(callHandler.handle).toHaveBeenCalledTimes(1);
					done();
				},
				error: (err) => {
					done(err);
				},
			});
		});

		it("должен обработать ошибку при подтверждении дубликата сообщения", (done) => {
			const message = {
				correlationId,
				correlationTimestamp,
				data: "test",
			};

			executionContext.getType.mockReturnValue("rpc");
			executionContext.getArgByIndex.mockReturnValue(message);
			redisService.get.mockResolvedValue(String(correlationTimestamp));

			const rmqContext = {
				getChannelRef: jest.fn().mockImplementation(() => {
					throw new Error("Channel error");
				}),
				getMessage: jest.fn(),
			} as unknown as RmqContext;

			executionContext.switchToRpc = jest.fn().mockReturnValue({
				getContext: jest.fn().mockReturnValue(rmqContext),
			});

			const result = interceptor.intercept(executionContext, callHandler);

			result.subscribe({
				next: (value) => {
					expect(value).toEqual({
						duplicate: true,
						correlationId,
					});
					expect(mockLoggerInstance.error).toHaveBeenCalledWith(
						expect.stringContaining("Failed to acknowledge duplicate message")
					);
					done();
				},
				error: (err) => {
					done(err);
				},
			});
		});

		it("должен обработать не-Error ошибку при подтверждении дубликата сообщения", (done) => {
			const message = {
				correlationId,
				correlationTimestamp,
				data: "test",
			};

			executionContext.getType.mockReturnValue("rpc");
			executionContext.getArgByIndex.mockReturnValue(message);
			redisService.get.mockResolvedValue(String(correlationTimestamp));

			const rmqContext = {
				getChannelRef: jest.fn().mockImplementation(() => {
					throw "String error";
				}),
				getMessage: jest.fn(),
			} as unknown as RmqContext;

			executionContext.switchToRpc = jest.fn().mockReturnValue({
				getContext: jest.fn().mockReturnValue(rmqContext),
			});

			const result = interceptor.intercept(executionContext, callHandler);

			result.subscribe({
				next: (value) => {
					expect(value).toEqual({
						duplicate: true,
						correlationId,
					});
					expect(mockLoggerInstance.error).toHaveBeenCalledWith(
						expect.stringContaining("Failed to acknowledge duplicate message: String error")
					);
					done();
				},
				error: (err) => {
					done(err);
				},
			});
		});

		it("должен обработать случай, когда RmqContext не имеет необходимых методов", (done) => {
			const message = {
				correlationId,
				correlationTimestamp,
				data: "test",
			};

			executionContext.getType.mockReturnValue("rpc");
			executionContext.getArgByIndex.mockReturnValue(message);
			redisService.get.mockResolvedValue(String(correlationTimestamp));

			const rmqContext = {} as unknown as RmqContext;

			executionContext.switchToRpc = jest.fn().mockReturnValue({
				getContext: jest.fn().mockReturnValue(rmqContext),
			});

			const result = interceptor.intercept(executionContext, callHandler);

			result.subscribe({
				next: (value) => {
					expect(value).toEqual({
						duplicate: true,
						correlationId,
					});
					done();
				},
			});
		});

		it("должен обработать случай, когда RmqContext имеет getChannelRef, но не имеет getMessage", (done) => {
			const message = {
				correlationId,
				correlationTimestamp,
				data: "test",
			};

			executionContext.getType.mockReturnValue("rpc");
			executionContext.getArgByIndex.mockReturnValue(message);
			redisService.get.mockResolvedValue(String(correlationTimestamp));

			const rmqContext = {
				getChannelRef: jest.fn().mockReturnValue({
					ack: jest.fn(),
				}),
			} as unknown as RmqContext;

			executionContext.switchToRpc = jest.fn().mockReturnValue({
				getContext: jest.fn().mockReturnValue(rmqContext),
			});

			const result = interceptor.intercept(executionContext, callHandler);

			result.subscribe({
				next: (value) => {
					expect(value).toEqual({
						duplicate: true,
						correlationId,
					});
					done();
				},
			});
		});

		it("должен обработать случай, когда RmqContext имеет getMessage, но не имеет getChannelRef", (done) => {
			const message = {
				correlationId,
				correlationTimestamp,
				data: "test",
			};

			executionContext.getType.mockReturnValue("rpc");
			executionContext.getArgByIndex.mockReturnValue(message);
			redisService.get.mockResolvedValue(String(correlationTimestamp));

			const rmqContext = {
				getMessage: jest.fn().mockReturnValue({}),
			} as unknown as RmqContext;

			executionContext.switchToRpc = jest.fn().mockReturnValue({
				getContext: jest.fn().mockReturnValue(rmqContext),
			});

			const result = interceptor.intercept(executionContext, callHandler);

			result.subscribe({
				next: (value) => {
					expect(value).toEqual({
						duplicate: true,
						correlationId,
					});
					done();
				},
			});
		});

		it("должен обработать случай, когда RmqContext имеет методы, но они не являются функциями", (done) => {
			const message = {
				correlationId,
				correlationTimestamp,
				data: "test",
			};

			executionContext.getType.mockReturnValue("rpc");
			executionContext.getArgByIndex.mockReturnValue(message);
			redisService.get.mockResolvedValue(String(correlationTimestamp));

			const rmqContext = {
				getChannelRef: "not a function",
				getMessage: "not a function",
			} as unknown as RmqContext;

			executionContext.switchToRpc = jest.fn().mockReturnValue({
				getContext: jest.fn().mockReturnValue(rmqContext),
			});

			const result = interceptor.intercept(executionContext, callHandler);

			result.subscribe({
				next: (value) => {
					expect(value).toEqual({
						duplicate: true,
						correlationId,
					});
					done();
				},
			});
		});

		it("должен обработать случай, когда RmqContext равен null", (done) => {
			const message = {
				correlationId,
				correlationTimestamp,
				data: "test",
			};

			executionContext.getType.mockReturnValue("rpc");
			executionContext.getArgByIndex.mockReturnValue(message);
			redisService.get.mockResolvedValue(String(correlationTimestamp));

			executionContext.switchToRpc = jest.fn().mockReturnValue({
				getContext: jest.fn().mockReturnValue(null),
			});

			const result = interceptor.intercept(executionContext, callHandler);

			result.subscribe({
				next: (value) => {
					expect(value).toEqual({
						duplicate: true,
						correlationId,
					});
					done();
				},
			});
		});
	});

	describe("constructor", () => {
		it("должен установить правильный контекст логгера", () => {
			expect(mockLoggerInstance.setContext).toHaveBeenCalledWith("RabbitMQIdempotencyInterceptor");
		});

		it("должен вызвать setContext при создании нового экземпляра", () => {
			const testRedisService = {
				get: jest.fn(),
				set: jest.fn(),
				del: jest.fn(),
			} as unknown as jest.Mocked<RedisClientService>;

			const testLoggerInstance = {
				log: jest.fn(),
				error: jest.fn(),
				warn: jest.fn(),
				debug: jest.fn(),
				setContext: jest.fn(),
			} as unknown as jest.Mocked<LoggerService>;

			(LoggerService as jest.Mock).mockImplementation(() => testLoggerInstance);

			const testInterceptor = new RabbitMQIdempotencyInterceptor(testRedisService, testLoggerInstance);

			expect(testInterceptor).toBeDefined();
			expect(testLoggerInstance.setContext).toHaveBeenCalledTimes(1);
			expect(testLoggerInstance.setContext).toHaveBeenCalledWith("RabbitMQIdempotencyInterceptor");
		});

		it("должен корректно инициализировать все зависимости конструктора", () => {
			const testRedisService = {
				get: jest.fn(),
				set: jest.fn(),
				del: jest.fn(),
			} as unknown as jest.Mocked<RedisClientService>;

			const testLoggerInstance = {
				log: jest.fn(),
				error: jest.fn(),
				warn: jest.fn(),
				debug: jest.fn(),
				setContext: jest.fn(),
			} as unknown as jest.Mocked<LoggerService>;

			(LoggerService as jest.Mock).mockImplementation(() => testLoggerInstance);

			const testInterceptor = new RabbitMQIdempotencyInterceptor(testRedisService, testLoggerInstance);

			expect(testInterceptor).toBeInstanceOf(RabbitMQIdempotencyInterceptor);
			expect(testLoggerInstance.setContext).toHaveBeenCalledWith(RabbitMQIdempotencyInterceptor.name);
		});

		it("должен выполнить тело конструктора (строки 27-28) при создании экземпляра", () => {
			const testRedisService = {
				get: jest.fn(),
				set: jest.fn(),
				del: jest.fn(),
			} as unknown as jest.Mocked<RedisClientService>;

			const testLoggerInstance = {
				log: jest.fn(),
				error: jest.fn(),
				warn: jest.fn(),
				debug: jest.fn(),
				setContext: jest.fn(),
			} as unknown as jest.Mocked<LoggerService>;

			(LoggerService as jest.Mock).mockImplementation(() => testLoggerInstance);

			// Создаем новый экземпляр, чтобы гарантировать выполнение строк 27-28
			const testInterceptor = new RabbitMQIdempotencyInterceptor(testRedisService, testLoggerInstance);

			// Проверяем, что конструктор выполнился полностью (строка 27 - открывающая скобка)
			// и что setContext был вызван (строка 28)
			expect(testInterceptor).toBeDefined();
			expect(testInterceptor).toBeInstanceOf(RabbitMQIdempotencyInterceptor);
			expect(testLoggerInstance.setContext).toHaveBeenCalledTimes(1);
			expect(testLoggerInstance.setContext).toHaveBeenCalledWith("RabbitMQIdempotencyInterceptor");
		});

		it("должен выполнить инициализацию logger.setContext в конструкторе (строка 28)", () => {
			const testRedisService = {
				get: jest.fn(),
				set: jest.fn(),
				del: jest.fn(),
			} as unknown as jest.Mocked<RedisClientService>;

			const testLoggerInstance = {
				log: jest.fn(),
				error: jest.fn(),
				warn: jest.fn(),
				debug: jest.fn(),
				setContext: jest.fn(),
			} as unknown as jest.Mocked<LoggerService>;

			(LoggerService as jest.Mock).mockImplementation(() => testLoggerInstance);

			// Создаем экземпляр для покрытия строк 27-28
			new RabbitMQIdempotencyInterceptor(testRedisService, testLoggerInstance);

			// Проверяем выполнение строки 28: this.logger.setContext(...)
			expect(testLoggerInstance.setContext).toHaveBeenCalledTimes(1);
			expect(testLoggerInstance.setContext).toHaveBeenCalledWith(RabbitMQIdempotencyInterceptor.name);
		});
	});

	describe("hasCorrelationId", () => {
		it("должен вернуть true для объекта с корректным correlationId", () => {
			const message = {
				correlationId: "test-id",
				data: "test",
			};

			const result = (
				interceptor as unknown as {
					hasCorrelationId: (data: unknown) => boolean;
				}
			).hasCorrelationId(message);

			expect(result).toBe(true);
		});

		it("должен вернуть false для null", () => {
			const result = (
				interceptor as unknown as {
					hasCorrelationId: (data: unknown) => boolean;
				}
			).hasCorrelationId(null);

			expect(result).toBe(false);
		});

		it("должен вернуть false для объекта без correlationId", () => {
			const message = {
				data: "test",
			};

			const result = (
				interceptor as unknown as {
					hasCorrelationId: (data: unknown) => boolean;
				}
			).hasCorrelationId(message);

			expect(result).toBe(false);
		});

		it("должен вернуть false для объекта с correlationId не строкового типа", () => {
			const message = {
				correlationId: 123,
			};

			const result = (
				interceptor as unknown as {
					hasCorrelationId: (data: unknown) => boolean;
				}
			).hasCorrelationId(message);

			expect(result).toBe(false);
		});

		it("должен вернуть false для примитивных типов", () => {
			expect(
				(
					interceptor as unknown as {
						hasCorrelationId: (data: unknown) => boolean;
					}
				).hasCorrelationId("string")
			).toBe(false);

			expect(
				(
					interceptor as unknown as {
						hasCorrelationId: (data: unknown) => boolean;
					}
				).hasCorrelationId(123)
			).toBe(false);

			expect(
				(
					interceptor as unknown as {
						hasCorrelationId: (data: unknown) => boolean;
					}
				).hasCorrelationId(true)
			).toBe(false);
		});

		it("должен вернуть false для undefined", () => {
			const result = (
				interceptor as unknown as {
					hasCorrelationId: (data: unknown) => boolean;
				}
			).hasCorrelationId(undefined);

			expect(result).toBe(false);
		});

		it("должен вернуть false для объекта с correlationId равным undefined", () => {
			const message = {
				correlationId: undefined,
				data: "test",
			};

			const result = (
				interceptor as unknown as {
					hasCorrelationId: (data: unknown) => boolean;
				}
			).hasCorrelationId(message);

			expect(result).toBe(false);
		});

		it("должен вернуть false для объекта с correlationId равным null", () => {
			const message = {
				correlationId: null,
				data: "test",
			};

			const result = (
				interceptor as unknown as {
					hasCorrelationId: (data: unknown) => boolean;
				}
			).hasCorrelationId(message);

			expect(result).toBe(false);
		});
	});
});
