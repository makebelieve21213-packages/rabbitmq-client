import { ServerRMQ } from "@nestjs/microservices";
import {
	DISCONNECTED_RMQ_MESSAGE,
	RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
	RQM_DEFAULT_NO_ASSERT,
	RQM_DEFAULT_PREFETCH_COUNT,
} from "@nestjs/microservices/constants";

import type { Channel } from "amqp-connection-manager";
import type { AmqpConsumeMessage } from "src/types/amqp-consume-message";

function customRegisterDisconnectListener(this: CustomServerRMQ): void {
	if (this.server) {
		this.server.on("disconnect", (err: unknown) => {
			(this._status$ as { next(value: string): void }).next("disconnected");
			this.logger.error(DISCONNECTED_RMQ_MESSAGE);
			if (err instanceof Error) {
				this.logger.error(err.message);
			} else if (typeof err === "string") {
				this.logger.error(err);
			} else {
				try {
					this.logger.error(JSON.stringify(err));
				} catch {
					this.logger.error(String(err));
				}
			}
		});
	}
}

/**
 * Расширение ServerRMQ с улучшенным логированием отключений и поддержкой
 * явного указания routing keys через options.pattern (comma-separated строка).
 */
export default class CustomServerRMQ extends ServerRMQ {
	override async setupChannel(channel: Channel, callback: () => void): Promise<void> {
		const noAssert =
			this.getOptionsProp(this.options, "noAssert") ??
			(this.queueOptions as { noAssert?: boolean }).noAssert ??
			RQM_DEFAULT_NO_ASSERT;

		if (!noAssert) {
			await channel.assertQueue(this.queue, this.queueOptions);
		}

		const isGlobalPrefetchCount = this.getOptionsProp(
			this.options,
			"isGlobalPrefetchCount",
			RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT
		);
		const prefetchCount = this.getOptionsProp(
			this.options,
			"prefetchCount",
			RQM_DEFAULT_PREFETCH_COUNT
		);

		if (this.options.exchange || this.options.wildcards) {
			const exchange = this.getOptionsProp(this.options, "exchange", this.options.queue);
			const exchangeType = this.getOptionsProp(this.options, "exchangeType", "topic");
			await channel.assertExchange(exchange, exchangeType, {
				durable: true,
				arguments: this.getOptionsProp(this.options, "exchangeArguments", {}),
			});

			if (this.options.routingKey) {
				await channel.bindQueue(this.queue, exchange, this.options.routingKey);
			}

			if (this.options.wildcards) {
				const opts = this.options as { pattern?: string };
				let routingKeys: string[];
				if (opts.pattern) {
					routingKeys = opts.pattern.split(",").map((p: string) => p.trim());
				} else {
					routingKeys = Array.from(this.getHandlers().keys());
				}
				await Promise.all(
					routingKeys.map((routingKey) => channel.bindQueue(this.queue, exchange, routingKey))
				);
				(
					this as unknown as { initializeWildcardHandlersIfExist(): void }
				).initializeWildcardHandlersIfExist();
			}
		}

		await channel.prefetch(prefetchCount, isGlobalPrefetchCount);
		channel.consume(
			this.queue,
			(msg: AmqpConsumeMessage | null) => {
				if (msg) {
					this.handleMessage(msg, channel);
				}
			},
			{
				noAck: this.noAck,
				consumerTag: this.getOptionsProp(this.options, "consumerTag", undefined),
			}
		);
		callback();
	}
}

// Override private registerDisconnectListener from ServerRMQ via prototype
(
	CustomServerRMQ.prototype as unknown as { registerDisconnectListener(): void }
).registerDisconnectListener = customRegisterDisconnectListener;
