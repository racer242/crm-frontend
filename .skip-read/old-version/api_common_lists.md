Мы сделали страницы списков сущностей для конкретных пользователей (user-prizes.json, user-acts.json и т.п.).
Теперь надо сделать страницы общие - списки содержат данные всех пользователей.
Страницы (общих списков) уже имеются, их нужно просто сравнить с теми, что есть и сделать их в соответствии с более актуальными (списков пользователей) и внести соответствующие изменения. Учесть, что на страницах общих списков уже не нужно выводить меню пользователя, хлебные крошки. Но должен остаться заголовок.

Кроме того, надо учесть, что в столбцах будет вывод e-mail, а значит надо взять еще кастомный столбец из config\pages\users.json (там есть пример как он должен выглядеть)

Вот соответствие страниц:

config\pages\acts.json - config\pages\user-acts.json
config\pages\codes.json - config\pages\user-codes.json (надо учитывать, что здесь иначе выглядит таблица, есть редактирование в диалоге)
config\pages\gtins.json - config\pages\user-gtins.json
config\pages\prizes.json - config\pages\user-prizes.json
config\pages\receipts.json - config\pages\user-receipts.json

Переход со таблиц должен вести на соответственно на страницы просмотра (кроме codes.json - там нет перехода) и редактирования. Эти таблицы надо создать. Разница с user-_ страницами - не требуется меню пользователя. Хлебные крошки нужны.
Также по аналогии с user-_ страницами:
config\pages\act.json - config\pages\user-act.json
config\pages\act-edit.json - config\pages\user-act-edit.json
config\pages\act-add.json - config\pages\user-act-add.json
config\pages\gtin.json - config\pages\user-gtin.json
config\pages\gtin-edit.json - config\pages\user-gtin-edit.json
config\pages\prize-add.json - config\pages\user-prize-add.json
config\pages\prize-edit.json - config\pages\user-prize-edit.json
config\pages\prize.json - config\pages\user-prize.json
config\pages\receipt-edit.json - config\pages\user-receipt-edit.json
config\pages\receipt.json - config\pages\user-receipt.json

Все адаптеры и api-роуты уже актуальны.
