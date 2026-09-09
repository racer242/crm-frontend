Ознакомься с эндпойнтом получения данных пользователя.
.prompts\docs\api\Данные участника.md
.prompts\docs\api\Коды участников.md
.prompts\docs\api\Коды Честный Знак.md
.prompts\docs\api\Призы.md
.prompts\docs\api\Чеки.md

Создай страницы:
config\pages\user-prizes.json
config\pages\user-points.json
config\pages\user-receipts.json
config\pages\user-codes.json
config\pages\user-gtins.json
config\pages\user-products.json
config\pages\user-events.json
config\pages\user-transactions.json
config\pages\user-messages.json

На эти страницы будут осуществляется переходы в виде http://host/users/23747/...
где 23747 - это id пользователя.

Запросы осуществляеются через свойство dataFeed (серверная загрузка данных перед серверным рендером, см docs\data-feed-reference.md). Табличные данные поставляются с поисковыми строками и фильтрами, через обобщенные настройки команд в shortcuts (см docs\linkage-reference.md, docs\macros-reference.md).
Вся конфигурация аналогична той, что на страницах:

- config\pages\users.json
- config\pages\user-acts.json (список актов)

Для всех роутов надо предусмотреть адаптеры (см. docs\data-adapter-reference.md), по аналогии с:
config\adapters\users-params.js - подготовка параметров
config\adapters\users-2-tabview.js - подготовка ответа API

Страницы "Призы", "Коды" содержат кнопку "Добавить" (пока заглушка)

Есть исключение - страница Баллы (user-points.json) - в ней таблица поставляется через запрос История начислений - (users/[id]/points/history). А эти данные выводятся карточками, как на странице user.json (см. statsRowSection):

- Текущее (сколько у участника баллов на данный момент)
- Потратил (сколько участник потратил баллов)
- Всего (сколько участник набрал баллов за всю кампанию)
  Страница содержит кнопку "Изменить" (пока заглушка)

Визуализация должна быть построена на компонентах системы docs\components-reference.md

Все страницы надо зарегистрировать в config\crm-config.json
