// Мок для @makebelieve21213-packages/redis-client
export class RedisClientService {
	get = jest.fn();
	set = jest.fn();
	del = jest.fn();
	exists = jest.fn();
	hexists = jest.fn();
}

export default RedisClientService;
