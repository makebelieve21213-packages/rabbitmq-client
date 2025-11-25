# Changelog

Все значимые изменения в этом проекте будут документироваться в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и этот проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

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
