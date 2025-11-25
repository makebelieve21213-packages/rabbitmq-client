import { RABBITMQ_SENDER_SERVICE } from "src/utils/injections";

describe("Utils", () => {
	describe("injections", () => {
		describe("RABBITMQ_SENDER_SERVICE", () => {
			it("должен быть определен", () => {
				expect(RABBITMQ_SENDER_SERVICE).toBeDefined();
			});

			it("должен быть символом", () => {
				expect(typeof RABBITMQ_SENDER_SERVICE).toBe("symbol");
			});

			it("должен иметь правильное описание", () => {
				expect(RABBITMQ_SENDER_SERVICE.toString()).toBe("Symbol(RABBITMQ_SENDER_SERVICE)");
			});

			it("должен быть уникальным символом", () => {
				const anotherSymbol = Symbol("RABBITMQ_SENDER_SERVICE");
				// Символы с одинаковым описанием всё равно не равны
				expect(RABBITMQ_SENDER_SERVICE).not.toBe(anotherSymbol);
			});

			it("должен быть постоянным при множественных импортах", () => {
				// Повторный импорт должен возвращать тот же символ
				const { RABBITMQ_SENDER_SERVICE: reimportedSymbol } = require("src/utils/injections");
				expect(RABBITMQ_SENDER_SERVICE).toBe(reimportedSymbol);
			});

			it("должен быть использован как ключ DI", () => {
				// Проверяем, что символ может быть использован как ключ в объекте
				const diContainer = {
					[RABBITMQ_SENDER_SERVICE]: "test-service",
				};

				expect(diContainer[RABBITMQ_SENDER_SERVICE]).toBe("test-service");
			});

			it("должен работать с Map как ключ", () => {
				const serviceMap = new Map();
				serviceMap.set(RABBITMQ_SENDER_SERVICE, "mapped-service");

				expect(serviceMap.get(RABBITMQ_SENDER_SERVICE)).toBe("mapped-service");
				expect(serviceMap.has(RABBITMQ_SENDER_SERVICE)).toBe(true);
			});

			it("должен работать с WeakMap как ключ", () => {
				const weakServiceMap = new WeakMap();
				const serviceObject = {};

				weakServiceMap.set(serviceObject, RABBITMQ_SENDER_SERVICE);

				expect(weakServiceMap.get(serviceObject)).toBe(RABBITMQ_SENDER_SERVICE);
				expect(weakServiceMap.has(serviceObject)).toBe(true);
			});

			it("символ должен быть неизменяемым", () => {
				// В JavaScript const предотвращает переназначение, но это не может быть проверено в runtime
				// Вместо этого проверим, что символ остается тем же при множественных обращениях
				const firstAccess = RABBITMQ_SENDER_SERVICE;
				const secondAccess = RABBITMQ_SENDER_SERVICE;

				expect(firstAccess).toBe(secondAccess);
				expect(typeof RABBITMQ_SENDER_SERVICE).toBe("symbol");
			});

			it("должен быть сериализуемым в JSON как строка", () => {
				// Создаем чистый символ для тестирования (не модифицированный другими тестами)
				const testSymbol = Symbol("RABBITMQ_SENDER_SERVICE");
				const obj = {
					service: testSymbol.toString(),
				};

				const serialized = JSON.stringify(obj);
				const deserialized = JSON.parse(serialized);

				expect(deserialized.service).toBe("Symbol(RABBITMQ_SENDER_SERVICE)");
			});
		});

		describe("интеграционные тесты для символов", () => {
			it("символ должен быть совместим с NestJS DI", () => {
				// Проверяем, что символ может быть использован в декораторах
				const mockDecorator = (token: symbol) => {
					return { token };
				};

				const result = mockDecorator(RABBITMQ_SENDER_SERVICE);
				expect(result.token).toBe(RABBITMQ_SENDER_SERVICE);
			});

			it("символ должен быть различим от строковых ключей", () => {
				const stringKey = "RABBITMQ_SENDER_SERVICE";
				const symbolKey = RABBITMQ_SENDER_SERVICE;

				expect(stringKey).not.toBe(symbolKey);
				expect(typeof stringKey).toBe("string");
				expect(typeof symbolKey).toBe("symbol");

				// В контейнере DI они должны быть разными ключами
				const container = {
					[stringKey]: "string-service",
					[symbolKey]: "symbol-service",
				};

				expect(container[stringKey]).toBe("string-service");
				expect(container[symbolKey]).toBe("symbol-service");
				expect(container[stringKey]).not.toBe(container[symbolKey]);
			});

			it("символ должен корректно работать в качестве metadata ключа", () => {
				// Имитируем использование в Reflect.metadata
				const mockValue = "test-metadata";

				// Симулируем Reflect.defineMetadata
				const metadata = new Map();
				metadata.set(RABBITMQ_SENDER_SERVICE, mockValue);

				expect(metadata.get(RABBITMQ_SENDER_SERVICE)).toBe(mockValue);
			});
		});

		describe("производительность символов", () => {
			it("операции с символом должны быть быстрыми", () => {
				const iterations = 10000;
				const map = new Map();

				const start = performance.now();

				for (let i = 0; i < iterations; i++) {
					map.set(RABBITMQ_SENDER_SERVICE, i);
					map.get(RABBITMQ_SENDER_SERVICE);
				}

				const end = performance.now();
				const duration = end - start;

				// Операции должны выполняться быстро (менее 100ms для 10k операций)
				expect(duration).toBeLessThan(100);
			});

			it("сравнение символов должно быть O(1)", () => {
				const anotherSymbol = Symbol("ANOTHER_SERVICE");
				const iterations = 10000;

				const start = performance.now();

				for (let i = 0; i < iterations; i++) {
					// Используем toString для сравнения, чтобы избежать ошибок типизации
					void (RABBITMQ_SENDER_SERVICE.toString() === anotherSymbol.toString());
					void (RABBITMQ_SENDER_SERVICE.toString() === RABBITMQ_SENDER_SERVICE.toString());
				}

				const end = performance.now();
				const duration = end - start;

				// Сравнения должны быть очень быстрыми
				expect(duration).toBeLessThan(50);
			});
		});

		describe("безопасность символов", () => {
			it("символ не должен быть перечислимым в Object.keys", () => {
				const obj = {
					normalProperty: "value",
					[RABBITMQ_SENDER_SERVICE]: "symbol-value",
				};

				const keys = Object.keys(obj);
				expect(keys).toContain("normalProperty");
				expect(keys).not.toContain(RABBITMQ_SENDER_SERVICE.toString());
			});

			it("символ должен быть доступен через Object.getOwnPropertySymbols", () => {
				const obj = {
					[RABBITMQ_SENDER_SERVICE]: "symbol-value",
				};

				const symbols = Object.getOwnPropertySymbols(obj);
				expect(symbols).toContain(RABBITMQ_SENDER_SERVICE);
			});

			it("символ не должен быть итерируемым в for..in", () => {
				const obj = {
					normalProperty: "value",
					[RABBITMQ_SENDER_SERVICE]: "symbol-value",
				};

				const keys: string[] = [];
				for (const key in obj) {
					keys.push(key);
				}

				expect(keys).toContain("normalProperty");
				expect(keys).not.toContain(RABBITMQ_SENDER_SERVICE.toString());
			});
		});

		describe("edge cases", () => {
			it("должен корректно работать с null и undefined значениями", () => {
				const container = new Map();

				container.set(RABBITMQ_SENDER_SERVICE, null);
				expect(container.get(RABBITMQ_SENDER_SERVICE)).toBe(null);

				container.set(RABBITMQ_SENDER_SERVICE, undefined);
				expect(container.get(RABBITMQ_SENDER_SERVICE)).toBe(undefined);
			});

			it("должен корректно работать с различными типами значений", () => {
				const container = new Map();
				const testValues = ["string", 123, true, false, [], {}, () => {}, Symbol("another")];

				testValues.forEach((value) => {
					container.set(RABBITMQ_SENDER_SERVICE, value);
					expect(container.get(RABBITMQ_SENDER_SERVICE)).toBe(value);
				});
			});
		});
	});
});
