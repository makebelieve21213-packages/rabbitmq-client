# Changelog

Все значимые изменения в этом проекте будут документироваться в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и этот проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

## [1.0.4] - 2026-03-03

### Исправлено
- Удалено свойство `x-dead-letter-routing-key` из `createReceiverConfig` и `createRetryConfig` — при нескольких паттернах (comma-separated) это ломало retry: AMQP трактовал строку как единый routing key, сообщения из retry-очереди не возвращались в основную. Без свойства RabbitMQ сохраняет оригинальный routing key при dead-letter
- Добавлены `pattern: '#'` и `noAck: true` в `createDLXConfig` — очередь `global.dlx` не была привязана к exchange (при `wildcards: true` без pattern берутся routing keys из хендлеров, у DLX их нет), сообщения терялись

## [1.0.3] - 2026-02-24

### Добавлено
- Класс `CustomServerRMQ`, расширяющий `ServerRMQ` из `@nestjs/microservices`
- Использование: `app.connectMicroservice({ strategy: new CustomServerRMQ(options) })`
- Улучшенное логирование ошибок в `registerDisconnectListener` — корректная обработка разных типов `err` (Error, string, object)
- Поддержка `options.pattern` в `setupChannel` для явного указания routing keys (comma-separated строка)
- Упрощённая логика `assertQueue` — везде используется `this.queue` напрямую
- Экспорт `CustomServerRMQ` из пакета

## [1.0.2] - 2026-01-11

### Изменено
- **BREAKING CHANGE**: Удален enum `ROUTING_KEYS` из пакета
- Routing keys теперь передаются через конфигурацию `RabbitMQSenderOptions.routingKeys`
- Методы `fireAndForget` и `publish` теперь принимают строковые ключи вместо enum
- Типы `RoutingKey` и `RoutingKeys` экспортируются для использования в проектах
- Пакет больше не содержит захардкоженных routing keys - все ключи определяются в проекте

### Удалено
- Enum `ROUTING_KEYS` - больше не экспортируется из пакета
- Хардкод routing keys в функции `createSenderConfig`

### Добавлено
- Тип `RoutingKey` для представления отдельного ключа маршрутизации
- Тип `RoutingKeys` для представления объекта routing keys
- Валидация наличия routing keys в конфигурации с выбросом ошибки при отсутствии
- Проверка существования routing key при отправке сообщений

### Миграция
Для миграции на новую версию:
1. Добавьте поле `routingKeys` в конфигурацию `RabbitMQSenderOptions`
2. Замените использование `ROUTING_KEYS` enum на строковые ключи из вашего проекта
3. Обновите вызовы `fireAndForget` и `publish` для использования строковых ключей

## [1.0.1] - 2026-01-05

### Добавлено
- Поддержка передачи заголовков и других опций сообщения через метод `publish` в `RabbitMQService`
- Опциональный параметр `options` типа `RmqRecordOptions` в метод `publish` для передачи заголовков, приоритета и других метаданных
- Экспорт типа `RmqRecordOptions` из пакета для использования в других проектах
- Использование `RmqRecordBuilder` из `@nestjs/microservices` для создания записей с заголовками

### Изменено
- Метод `RabbitMQService.publish` теперь принимает опциональный третий параметр `options` для передачи заголовков
- Сохранена полная обратная совместимость - существующий код продолжает работать без изменений

## [1.0.0] - 2025-11-25

### Добавлено
- Базовая функциональность RabbitMQ клиента для NestJS
- NestJS модуль `RabbitMQModule` с поддержкой конфигурации
- Сервис `RabbitMQService` для работы с RabbitMQ
- Поддержка отправки и получения сообщений через RabbitMQ
- Функции `connectRabbitMQReceiver` и `connectRabbitMQReceivers` для подключения получателей
- Поддержка DLX (Dead Letter Exchange) конфигурации
- Поддержка retry механизмов
- Идемпотентность сообщений через `RabbitMQIdempotencyInterceptor`
- Полная типизация TypeScript с экспортируемыми типами
- Обработка ошибок с детальным логированием
- Интеграция с `@makebelieve21213-packages/logger` и другими пакетами

### Документация
- Подробный README с примерами использования
- llms.txt для контекста ИИ агентов
- Инструкции по развертыванию в Docker
- Руководство по внесению вклада (CONTRIBUTING.md)
