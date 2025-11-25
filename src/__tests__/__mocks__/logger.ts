// Мок для @makebelieve21213-packages/logger
export class LoggerService {
	log = jest.fn();
	error = jest.fn();
	warn = jest.fn();
	debug = jest.fn();
	info = jest.fn();
	setContext = jest.fn();
}

export default LoggerService;
