import { LoggerService } from "@makebelieve21213-packages/logger";
import connectRabbitMQReceiver from "src/connect-rabbitmq-receiver";

import type { INestApplication } from "@nestjs/common";
import type RabbitMQReceiverOptions from "src/types/rabbitmq-receiver-options";

/**
 * Подключает множественные подписки RabbitMQ
 * Принимает массив готовых объектов RabbitMQReceiverOptions и вызывает connectRabbitMQReceiver для каждого
 */
export default async function connectRabbitMQReceivers(
	app: INestApplication,
	receiverOptionsList: RabbitMQReceiverOptions[]
): Promise<void> {
	const logger = await app.resolve(LoggerService);

	// Подключаем каждую подписку на сообщения
	for (let i = 0; i < receiverOptionsList.length; i++) {
		const receiverOptions = receiverOptionsList[i];
		const isFirstSubscription = i === 0;

		await connectRabbitMQReceiver(app, receiverOptions, !isFirstSubscription);

		logger.log(
			`RabbitMQ subscription connected [queue: ${receiverOptions.queue}, pattern: ${receiverOptions.pattern}, exchange: ${receiverOptions.exchange}, exchangeType: ${receiverOptions.exchangeType}]`
		);
	}

	logger.log(`All RabbitMQ subscriptions connected [count: ${receiverOptionsList.length}]`);
}
