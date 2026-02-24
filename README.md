# @makebelieve21213-packages/rabbitmq-client

RabbitMQ клиент для NestJS с поддержкой TypeScript и полной типобезопасностью. Обеспечивает надежную отправку и получение сообщений между микросервисами с поддержкой retry-механизмов, Dead Letter Queue (DLQ) и идемпотентности сообщений.

## 📋 Содержание

- [Возможности](#-возможности)
- [Требования](#-требования)
- [Установка](#-установка)
- [Структура пакета](#-структура-пакета)
- [Быстрый старт](#-быстрый-старт)
- [API Reference](#-api-reference)
- [Примеры использования](#-примеры-использования)
- [Troubleshooting](#-troubleshooting)
- [Тестирование](#-тестирование)

## 🚀 Возможности

- ✅ **NestJS интеграция** - глобальный модуль с forRootAsync для простой интеграции
- ✅ **CustomServerRMQ** - расширение ServerRMQ с улучшенным логированием и поддержкой явного указания routing keys
- ✅ **Type-safe API** - полная типобезопасность TypeScript с экспортируемыми типами
- ✅ **Отправка и получение сообщений** - поддержка fire-and-forget и request-response паттернов
- ✅ **Идемпотентность** - автоматическая проверка дубликатов сообщений через Redis
- ✅ **Retry механизм** - автоматические повторные попытки с настраиваемым TTL
- ✅ **Dead Letter Queue** - обработка критических ошибок через DLX
- ✅ **Множественные подписки** - поддержка подключения нескольких очередей одновременно
- ✅ **Обработка ошибок** - интеграция с UnifiedExceptionFilter для корректной обработки ошибок
- ✅ **100% покрытие тестами** - надежность и качество кода

## 📋 Требования

- **Node.js**: >= 22.13.0
- **NestJS**: >= 11.0.0
- **RabbitMQ**: сервер RabbitMQ
- **Redis**: сервер Redis (обязательно для полноценного использования идемпотентности)

## 📦 Установка

```bash
npm install @makebelieve21213-packages/rabbitmq-client
```

### Зависимости

```json
{
  "@nestjs/common": "^11.0.0",
  "@nestjs/config": "^4.0.0",
  "@nestjs/microservices": "^11.0.0",
  "@makebelieve21213-packages/logger": "^1.0.0",
  "@makebelieve21213-packages/nest-common": "^1.0.0",
  "@makebelieve21213-packages/redis-client": "^1.0.0",
  "rxjs": "^7.8.0",
  "uuid": "^11.0.0"
}
```

## 📁 Структура пакета

```
src/
├── main/                           # NestJS модуль и сервисы
├── server/                         # CustomServerRMQ (расширение ServerRMQ)
├── config/                         # Фабрики конфигураций
├── types/                          # TypeScript типы
├── utils/                          # Утилиты
├── connect-rabbitmq-receiver.ts    # Функция подключения одной подписки
├── connect-rabbitmq-receivers.ts   # Функция подключения множественных подписок
└── index.ts                        # Экспорты
```

## 🏗️ Архитектура

Пакет предоставляет NestJS глобальный модуль `RabbitMQModule` для отправки сообщений и функции `connectRabbitMQReceiver` / `connectRabbitMQReceivers` для получения сообщений через RabbitMQ.

**Основные компоненты:**
- `RabbitMQModule` - NestJS глобальный модуль для отправки
- `RabbitMQService` - сервис для отправки сообщений
- `CustomServerRMQ` - расширение `ServerRMQ` для `connectMicroservice` с улучшенным логированием
- `connectRabbitMQReceiver` - функция подключения одной подписки
- `connectRabbitMQReceivers` - функция подключения множественных подписок
- `RabbitMQIdempotencyInterceptor` - интерцептор для проверки идемпотентности
- Типы: `RabbitMQSenderOptions`, `RabbitMQReceiverOptions`, `IdempotentMessage`

## 🔧 Быстрый старт

### Шаг 1: Настройка переменных окружения

```env
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=events_exchange
RABBITMQ_EXCHANGE_TYPE=topic
RABBITMQ_QUEUE=your-service-queue
RABBITMQ_PATTERN=your.pattern.*
```

### Шаг 2: Подключение Redis (обязательно для идемпотентности)

```typescript
import { Module } from "@nestjs/common";
import { RedisModule } from "@makebelieve21213-packages/redis-client";

@Module({
  imports: [
    RedisModule.forRootAsync({
      // конфигурация Redis
    }),
  ],
})
export class AppModule {}
```

**Важно:** Без подключенного `RedisService` в DI контейнере приложения интерцептор `RabbitMQIdempotencyInterceptor` не сможет проверять дубликаты сообщений и будет пропускать проверку идемпотентности (graceful degradation).

### Шаг 3: Создание конфигурации

Создайте файл `rabbitmq.config.ts` в вашем сервисе:

```typescript
import { registerAs } from "@nestjs/config";
import type { RabbitMQSenderOptions, RabbitMQReceiverOptions } from "@makebelieve21213-packages/rabbitmq-client";
import { EnvVariable } from "src/types/enums";

export type RabbitMQConfiguration = {
  sender: RabbitMQSenderOptions;
  receiver: RabbitMQReceiverOptions;
};

const rabbitmqConfig = registerAs<RabbitMQConfiguration>(
  "rabbitmq",
  (): RabbitMQConfiguration => ({
    sender: {
      url: process.env[EnvVariable.RABBITMQ_URL]!,
      exchange: process.env[EnvVariable.RABBITMQ_EXCHANGE] || "events_exchange",
      exchangeType: process.env[EnvVariable.RABBITMQ_EXCHANGE_TYPE] || "topic",
      // Обязательный объект routing keys - ключи определяются в вашем проекте
      routingKeys: {
        "tokens.fetch.all": "tokens.fetch.all",
        "analytics.global": "analytics.global",
        "analytics.update.global": "analytics.update.global",
        // Добавьте все необходимые routing keys из вашего проекта
      },
    },
    receiver: {
      url: process.env[EnvVariable.RABBITMQ_URL]!,
      exchange: process.env[EnvVariable.RABBITMQ_EXCHANGE] || "events_exchange",
      exchangeType: process.env[EnvVariable.RABBITMQ_EXCHANGE_TYPE] || "topic",
      queue: process.env[EnvVariable.RABBITMQ_QUEUE]!,
      pattern: process.env[EnvVariable.RABBITMQ_PATTERN]!,
    },
  }),
);

export default rabbitmqConfig;
```

### Шаг 4: Регистрация модуля

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from '@makebelieve21213-packages/rabbitmq-client';
import rabbitmqConfig from 'src/configs/rabbitmq.config';
import type { RabbitMQConfiguration } from 'src/configs/rabbitmq.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [rabbitmqConfig],
    }),
    RabbitMQModule.forRootAsync<[RabbitMQConfiguration]>({
      useFactory: (config: RabbitMQConfiguration) => config.sender,
      inject: [rabbitmqConfig.KEY],
      imports: [ConfigModule],
    }),
  ],
})
export class AppModule {}
```

### Шаг 5: Подключение receiver в main.ts

```typescript
// main.ts
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { connectLogger } from "@makebelieve21213-packages/logger";
import { UnifiedExceptionFilter, UnifiedInterceptor } from "@makebelieve21213-packages/nest-common";
import { connectRabbitMQReceiver, type RabbitMQReceiverOptions } from "@makebelieve21213-packages/rabbitmq-client";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const config = app.get(ConfigService);
  const receiverOptions = config.get<RabbitMQReceiverOptions>("rabbitmq.receiver")!;
  
  // Перезаписываем стандартный логгер сервиса
  const logger = await connectLogger(app, "YourService");
  
  // Получаем dlxExchange из конфигурации RabbitMQ для RPC обработки ошибок
  const dlxExchange = receiverOptions.dlxExchange || "events_exchange.dlx";
  
  // Подключаем глобально единый фильтр для HTTP и RPC запросов (обработка ошибок)
  app.useGlobalFilters(new UnifiedExceptionFilter(logger, dlxExchange));
  
  // Подключаем глобально единый перехватчик для HTTP и RPC запросов (логирование и метрики всех запросов)
  app.useGlobalInterceptors(new UnifiedInterceptor(logger));
  
  // Подключаем RabbitMQ микросервис для получения сообщений
  await connectRabbitMQReceiver(app, receiverOptions);
  
  await app.startAllMicroservices();
  await app.listen(3000);
}

bootstrap();
```

### Шаг 6: Использование сервиса

```typescript
// your.service.ts
import { Injectable } from '@nestjs/common';
import { RabbitMQService } from '@makebelieve21213-packages/rabbitmq-client';

@Injectable()
export class YourService {
  constructor(private readonly rabbitMQ: RabbitMQService) {}

  async sendFireAndForget() {
    // Используйте ключи из объекта routingKeys, переданного в конфигурации
    await this.rabbitMQ.fireAndForget("analytics.update.global", {
      data: "example"
    });
  }

  async sendRequestResponse() {
    // Используйте ключи из объекта routingKeys, переданного в конфигурации
    const result = await this.rabbitMQ.publish<RequestData, ResponseData>(
      "analytics.global",
      { query: "analytics" }
    );
    return result;
  }
}
```

## 📚 API Reference

### RabbitMQModule

**forRootAsync(options):**

```typescript
RabbitMQModule.forRootAsync<[RabbitMQConfiguration]>({
  useFactory: (config: RabbitMQConfiguration) => config.sender,
  inject: [rabbitmqConfig.KEY],
  imports: [ConfigModule],
})
```

**Экспортирует:** `RabbitMQService` (глобально)

### RabbitMQService

**Методы:**

#### `fireAndForget<I>(key: string, data: I)`

Отправляет сообщение без ожидания ответа (fire-and-forget паттерн). Не добавляет `correlationId`.

**Параметры:**
- `key` - ключ маршрутизации из объекта `routingKeys`, переданного в конфигурации
- `data` - данные для отправки

```typescript
fireAndForget<I>(key: string, data: I): void
```

#### `publish<I, O>(key: string, data: I, options?: RmqRecordOptions): Promise<O>`

Отправляет сообщение и ожидает ответ (RPC паттерн). Автоматически добавляет `correlationId` и `correlationTimestamp` для идемпотентности.

**Параметры:**
- `key` - ключ маршрутизации из объекта `routingKeys`, переданного в конфигурации
- `data` - данные для отправки
- `options` (опционально) - опции для передачи заголовков и других метаданных

```typescript
publish<I, O>(key: string, data: I, options?: RmqRecordOptions): Promise<O>
```

### connectRabbitMQReceiver

Асинхронная функция для подключения одной подписки RabbitMQ.

```typescript
connectRabbitMQReceiver(
  app: INestApplication,
  receiverOptions: RabbitMQReceiverOptions,
  skipGlobalSetup?: boolean
): Promise<void>
```

**Параметры:**
- `app` - экземпляр NestJS приложения
- `receiverOptions` - опции для настройки receiver
- `skipGlobalSetup` (опционально) - пропустить установку глобальных компонентов

### connectRabbitMQReceivers

Асинхронная функция для подключения множественных подписок RabbitMQ.

```typescript
connectRabbitMQReceivers(
  app: INestApplication,
  receiverOptionsList: RabbitMQReceiverOptions[]
): Promise<void>
```

**Параметры:**
- `app` - экземпляр NestJS приложения
- `receiverOptionsList` - массив опций для настройки receivers

### CustomServerRMQ

Расширение `ServerRMQ` из `@nestjs/microservices` с улучшенным логированием отключений и поддержкой явного указания routing keys через `options.pattern` (comma-separated строка).

Используется вместо `connectRabbitMQReceiver`, когда нужно подключать RabbitMQ через `app.connectMicroservice()`:

```typescript
import { NestFactory } from "@nestjs/core";
import { CustomServerRMQ } from "@makebelieve21213-packages/rabbitmq-client";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice({
    strategy: new CustomServerRMQ({
      urls: [process.env.RABBITMQ_URL],
      queue: process.env.RABBITMQ_QUEUE,
      queueOptions: { durable: true },
      exchange: process.env.RABBITMQ_EXCHANGE,
      exchangeType: "topic",
      wildcards: true,
      pattern: "tokens.fetch.all,analytics.global,analytics.update.global", // явные routing keys
    }),
  });

  await app.startAllMicroservices();
  await app.listen(3000);
}
```

**Опции:**
- `pattern` (опционально) - comma-separated строка routing keys для bind; если не указано, используются ключи из зарегистрированных `@MessagePattern` обработчиков

### RabbitMQIdempotencyInterceptor

Глобальный интерцептор для проверки идемпотентности сообщений. Устанавливается автоматически в `connectRabbitMQReceiver` (если `skipGlobalSetup = false`).

**⚠️ Важно:** Требует наличия `RedisService` из пакета `@makebelieve21213-packages/redis-client` в DI контейнере приложения.

## 🧪 Примеры использования

### Отправка fire-and-forget сообщения

```typescript
// Используйте ключи из объекта routingKeys, переданного в конфигурации
await this.rabbitMQ.fireAndForget("analytics.update.global", {
  data: "example"
});
```

### Отправка request-response сообщения

```typescript
// Используйте ключи из объекта routingKeys, переданного в конфигурации
const result = await this.rabbitMQ.publish<RequestData, ResponseData>(
  "analytics.global",
  { query: "analytics" }
);
console.log(result);
```

### Отправка сообщения с заголовками

```typescript
const result = await this.rabbitMQ.publish<RequestData, ResponseData>(
  "analytics.global",
  { query: "analytics" },
  {
    headers: {
      "x-locale": "ru",
      "x-request-id": "unique-request-id",
    },
    priority: 5,
  }
);
```

### Создание обработчика сообщений

```typescript
import { Controller } from "@nestjs/common";
import { MessagePattern, RmqContext, Ctx } from "@nestjs/microservices";
import { RpcError, RpcErrorType } from "@makebelieve21213-packages/nest-common";

@Controller()
export class MessageController {
  // Используйте строковые ключи, соответствующие ключам в routingKeys конфигурации
  @MessagePattern("tokens.fetch.all")
  async handleTokenFetch(data: unknown, @Ctx() context: RmqContext) {
    try {
      // Ваша логика обработки
      return { success: true };
    } catch (error) {
      throw new RpcError(
        "Failed to fetch tokens",
        RpcErrorType.INTERNAL_ERROR,
      );
    }
  }
}
```

### Использование CustomServerRMQ через connectMicroservice

```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import { CustomServerRMQ } from "@makebelieve21213-packages/rabbitmq-client";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice({
    strategy: new CustomServerRMQ({
      urls: [process.env.RABBITMQ_URL!],
      queue: process.env.RABBITMQ_QUEUE!,
      queueOptions: { durable: true },
      exchange: process.env.RABBITMQ_EXCHANGE || "events_exchange",
      exchangeType: "topic",
      wildcards: true,
      pattern: "tokens.fetch.all,analytics.global",
    }),
  });

  await app.startAllMicroservices();
  await app.listen(3000);
}
```

### Подключение множественных подписок

```typescript
import { connectRabbitMQReceivers } from "@makebelieve21213-packages/rabbitmq-client";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const config = app.get(ConfigService);
  const receiverOptionsList = config.get<RabbitMQReceiverOptions[]>("rabbitmq.receivers")!;
  
  const logger = await connectLogger(app, "YourService");
  const dlxExchange = receiverOptionsList[0]?.dlxExchange || "events_exchange.dlx";
  
  app.useGlobalFilters(new UnifiedExceptionFilter(logger, dlxExchange));
  app.useGlobalInterceptors(new UnifiedInterceptor(logger));
  
  await connectRabbitMQReceivers(app, receiverOptionsList);
  
  await app.startAllMicroservices();
  await app.listen(3000);
}
```

## 🚨 Troubleshooting

### Идемпотентность не работает

**Решение:** Убедитесь, что `RedisModule` подключен в корневом модуле приложения. Без Redis интерцептор будет пропускать проверку идемпотентности (graceful degradation).

### Сообщения не доставляются

**Решение:** Проверьте конфигурацию RabbitMQ (URL, exchange, queue, pattern), убедитесь, что сервер RabbitMQ запущен и доступен.

### Ошибки не обрабатываются корректно

**Решение:** Убедитесь, что `UnifiedExceptionFilter` и `UnifiedInterceptor` установлены в `main.ts` перед вызовом `connectRabbitMQReceiver` или `connectRabbitMQReceivers`.

### Сообщения застревают в очереди

**Решение:** Проверьте обработчики сообщений - они должны корректно обрабатывать сообщения и возвращать результат или выбрасывать `RpcError` для ошибок.

## 🧪 Тестирование

Пакет имеет **высокое покрытие тестами** (>95% для веток, 100% для statements и функций).

```bash
pnpm test                # Все тесты
pnpm test:coverage       # С покрытием
```

## 🔧 Конфигурация

```typescript
interface RabbitMQSenderOptions {
  url: string;                    // URL подключения к RabbitMQ
  exchange: string;               // Имя основного exchange
  exchangeType: string;            // Тип exchange (обычно "topic")
  routingKeys: Record<string, string>; // Обязательный объект routing keys
                                    // Ключи определяются в вашем проекте, не в пакете
  replyQueueOptions?: {           // Опции для reply очередей RPC паттерна
    durable?: boolean;             // По умолчанию: false
    autoDelete?: boolean;          // По умолчанию: true
  };
}

interface RabbitMQReceiverOptions {
  url: string;                     // URL подключения к RabbitMQ
  exchange: string;                // Имя основного exchange
  exchangeType: string;            // Тип exchange
  queue: string;                   // Имя основной очереди
  pattern: string;                 // Паттерн routing key
  prefetchCount?: number;          // По умолчанию: 10
  noAck?: boolean;                 // По умолчанию: false
  replyQueue?: string;            // По умолчанию: ${queue}.reply
  retryQueue?: string;             // По умолчанию: ${queue}.retry
  retryExchange?: string;          // По умолчанию: ${exchange}.retry
  retryExchangeType?: string;      // По умолчанию: exchangeType
  retryTtl?: number;               // По умолчанию: 5000
  dlxQueue?: string;               // По умолчанию: global.dlx
  dlxExchange?: string;            // По умолчанию: events_exchange.dlx
  dlxExchangeType?: string;        // По умолчанию: exchangeType
}
```

**Примечание:** Конфигурация должна создаваться в сервисе, который использует пакет.

## 📦 Зависимости

- `@nestjs/common` - NestJS core
- `@nestjs/config` - NestJS config
- `@nestjs/microservices` - NestJS microservices
- `@makebelieve21213-packages/logger` - Логирование
- `@makebelieve21213-packages/nest-common` - Общие компоненты NestJS (RpcError, UnifiedExceptionFilter, UnifiedInterceptor)
- `@makebelieve21213-packages/redis-client` - Redis клиент для идемпотентности
- `rxjs` - Реактивные расширения
- `uuid` - Генерация уникальных ID

## 📄 Лицензия

MIT

## 👥 Автор

Skriabin Aleksei
