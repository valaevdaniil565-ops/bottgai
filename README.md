# Дело в системе

Сайт услуг по улучшению бизнес-процессов. Заявки сохраняются в PostgreSQL и отправляются владельцу через Telegram-бота.

## Что потребуется

- Node.js 18 или новее
- PostgreSQL 16 (или Docker Desktop)
- Telegram-бот и ID чата

## Быстрый запуск через Docker для базы данных

```powershell
git clone https://github.com/valaevdaniil565-ops/bottgai.git
cd bottgai
docker compose up -d db
Copy-Item .env.example .env
notepad .env
npm install
npm start
```

В открывшемся `.env` укажите значения `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`. Значение `DATABASE_URL` для Docker менять не нужно.

После запуска откройте [http://localhost:4173](http://localhost:4173).

## Запуск с уже установленным PostgreSQL

Создайте отдельную базу и пользователя любым удобным способом, затем выполните:

```powershell
git clone https://github.com/valaevdaniil565-ops/bottgai.git
cd bottgai
Copy-Item .env.example .env
notepad .env
npm install
npm start
```

В `.env` замените `DATABASE_URL` на строку подключения к своей базе:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/business_upgrade
TELEGRAM_BOT_TOKEN=токен_от_BotFather
TELEGRAM_CHAT_ID=id_вашего_чата
PORT=4173
```

Таблица `business_upgrade_leads` и индекс создаются автоматически при первом запуске. Дополнительно выполнять `schema.sql` не требуется.

## Проверка

1. Откройте диалог со своим ботом и нажмите **Start**.
2. Заполните форму на сайте.
3. Проверьте сообщение в Telegram.
4. Проверьте запись в PostgreSQL:

```sql
SELECT *
FROM business_upgrade_leads
ORDER BY created_at DESC;
```

## Безопасность

Файл `.env` исключён из Git. Не публикуйте токен бота и пароль базы данных. Если токен оказался в открытом доступе, перевыпустите его через BotFather и обновите `.env`.
