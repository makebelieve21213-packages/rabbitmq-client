// Enum для всех поддерживаемых routing keys RabbitMQ
export enum ROUTING_KEYS {
	// Токены
	TOKENS_FETCH_ALL = "tokens.fetch.all",
	TOKENS_FETCH_DETAILS_ETHEREUM = "tokens.fetch.details.ethereum",
	TOKENS_FETCH_DETAILS_NFT = "tokens.fetch.details.nft",
	TOKENS_DEPLOY_ETHEREUM = "tokens.deploy.ethereum",
	TOKENS_DEPLOY_NFT = "tokens.deploy.nft",

	// Аналитика (Request-Response)
	ANALYTICS_GLOBAL = "analytics.global",
	ANALYTICS_TOTAL_MARKET_CHART = "analytics.total.market.chart",
	ANALYTICS_MARKET_CHART = "analytics.market.chart",
	ANALYTICS_DOMINANCE_CHART = "analytics.dominance.chart",
	ANALYTICS_VOLUME_CHART = "analytics.volume.chart",
	ANALYTICS_TOP_VOLUME_LEADERS = "analytics.top.volume.leaders",
	ANALYTICS_TRENDING = "analytics.trending",
	ANALYTICS_COINS_TABLE = "analytics.coins.table",

	// Аналитика (Fire-and-Forget обновления)
	ANALYTICS_UPDATE_GLOBAL = "analytics.update.global",
	ANALYTICS_UPDATE_TOTAL_MARKET_CHART = "analytics.update.total.market.chart",
	ANALYTICS_UPDATE_MARKET_CHART = "analytics.update.market.chart",
	ANALYTICS_UPDATE_DOMINANCE_CHART = "analytics.update.dominance.chart",
	ANALYTICS_UPDATE_VOLUME_CHART = "analytics.update.volume.chart",
	ANALYTICS_UPDATE_TOP_VOLUME_LEADERS = "analytics.update.top.volume.leaders",
	ANALYTICS_UPDATE_TRENDING = "analytics.update.trending",
	ANALYTICS_UPDATE_COINS_TABLE = "analytics.update.coins.table",
}
