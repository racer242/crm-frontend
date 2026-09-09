Относительно настроек кампании.
В текущей версии хранятся настройки в конфигурации:
файл config\system\camps.json, подключенный к основной конфигурации config\crm-config.json

Элемент записи надо дополнить новыми параметрами:
{
"id": 7384,
"name": "Добрый Кола Summer 2026",
// изменилось api_url на base_api_url
"base_api_url": "https://dev.ssd26.srv08.ru/api/v2/7384",
// и новые:
// адрес crm api промо-инстанса
"crm_api_url": "https://dev.mn26.srv08.ru",
// Идентификатор ключа (X-Crm-Key-Id)
"crm_key_id": "dobrycola-dev",
// Секрет подписи HMAC  
 "crm_signature": "7acc1674eda5ca3923f62295b8b3bb004c186ccd0ba2cce391d008b20d9d6219",
},

Оставить только один элемент, остальные не нужны.
