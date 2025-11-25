// Настройки для тестов Jest
import "@jest/globals";

// Глобальные моки для тестов
global.console = {
	...console,
	// Отключаем логи в тестах для чистоты вывода
	log: jest.fn(),
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

// Мокаем process.env для тестов
process.env.NODE_ENV = "test";
