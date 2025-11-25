import { DynamicModule, Global, Module, Type } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ClientsModule } from "@nestjs/microservices";
import { createSenderConfig } from "src/config/factories";
import RabbitMQService from "src/main/rabbitmq.service";
import { RABBITMQ_SENDER_SERVICE } from "src/utils/injections";

import type RabbitMQSenderOptions from "src/types/rabbitmq-sender-options";

// Глобальный модуль отправки сообщений через RabbitMQ на другие сервисы
@Global()
@Module({})
export default class RabbitMQModule {
	// Статический метод для настройки модуля с конфигурацией через forRootAsync
	static forRootAsync(options: {
		imports?: Type<unknown>[];
		useFactory: (...args: unknown[]) => Promise<RabbitMQSenderOptions> | RabbitMQSenderOptions;
		inject?: unknown[];
	}): DynamicModule {
		return {
			module: RabbitMQModule,
			imports: [
				ConfigModule,
				...(options.imports || []),
				ClientsModule.registerAsync([
					{
						name: RABBITMQ_SENDER_SERVICE,
						imports: [ConfigModule, ...(options.imports || [])],
						useFactory: async (...args: unknown[]) => {
							// Получаем опции через useFactory
							const moduleOptions = await options.useFactory(...args);
							// Вычисляем конфигурацию sender
							const rmq = createSenderConfig(moduleOptions);

							return {
								transport: rmq.transport,
								options: rmq.options,
							};
						},
						inject: options.inject || [],
					},
				]),
			],
			providers: [RabbitMQService],
			exports: [RabbitMQService],
		};
	}
}
