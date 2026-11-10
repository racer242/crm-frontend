Теперь улучшим таблицу заданий.
Вот обновленный запрос и описание полей.
.prompts\user-page-sql2_1.md
Яхочу часть полей выводить в таблицу, часть - в попапе.

Что выводится в таблицу:
{
"name": "task_code",
"type": "string",
"title": "Код задания"
},
{
"name": "title",
"type": "string",
"title": "Название"
},
{
"name": "display_status",
"type": "string",
"title": "Статус"
},
{
"name": "start_date",
"type": "datetime",
"title": "Дата старта"
},
{
"name": "finish_date",
"type": "datetime",
"title": "Дата окончания"
},
{
"name": "is_continuous",
"type": "boolean",
"title": "Длительное задание"
},
{
"name": "assigned_at",
"type": "datetime",
"title": "Дата назначения"
},
{
"name": "accrued_at",
"type": "datetime",
"title": "Дата начисления баллов"
},
{
"name": "updated_at",
"type": "datetime",
"title": "Дата обновления"
}

Последний столбец с кнопкой иконкой "подробнее".
при нажатии на строку, открывается попап с ее более подробными данными.

Что выводится в попап:

Блок идентификации
{
"name": "task_id",
"type": "string",
"title": "ID задания"
},
{
"name": "task_code",
"type": "string",
"title": "Код задания"
},
Блок справочной информации  
 {
"name": "title",
"type": "string",
"title": "Название"
},  
 {
"name": "description",
"type": "string",
"title": "Описание"
},
{
"name": "league_code",
"type": "string",
"title": "Код лиги"
},
{
"name": "segment",
"type": "string",
"title": "Сегмент"
},
{
"name": "start_date",
"type": "datetime",
"title": "Дата старта"
},
{
"name": "finish_date",
"type": "datetime",
"title": "Дата окончания"
},
{
"name": "is_continuous",
"type": "boolean",
"title": "Длительное задание"
},

блок состояния

{
"name": "display_status",
"type": "string",
"title": "Статус"
},
{
"name": "status",
"type": "string",
"title": "Статус (идентификатор)"
},
{
"name": "assigned_at",
"type": "datetime",
"title": "Дата назначения"
},
{
"name": "accrued_at",
"type": "datetime",
"title": "Дата начисления баллов"
},
{
"name": "updated_at",
"type": "datetime",
"title": "Дата обновления"
}
