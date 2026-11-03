users
users

SELECT
BIN_TO_UUID(u.id) AS user_id,
u.participant_code,
TRIM(CONCAT_WS(' ', u.first_name, u.last_name)) AS full_name,
u.email,
u.phone,
u.status,
u.participant_status,
u.balance,
u.mailing,
u.created_at
FROM `user` u
WHERE 1=1
{{STATUS_FILTER}}
{{PARTICIPANT_STATUS_FILTER}}
{{MAILING_FILTER}}
{{DATE_FROM_FILTER}}
{{DATE_TO_FILTER}}
{{BALANCE_FILTER}}
{{SEARCH_FILTER}}
ORDER BY {{ORDER_BY}} {{ORDER_DIR}}

[
{
"name": "participant_code",
"type": "string",
"title": "Код"
},
{
"name": "full_name",
"type": "string",
"title": "Имя и фамилия"
},
{
"name": "email",
"type": "string",
"title": "Email"
},
{
"name": "phone",
"type": "string",
"title": "Телефон"
},
{
"name": "status",
"type": "string",
"title": "Статус"
},
{
"name": "balance",
"type": "number",
"title": "Баланс"
},
{
"name": "mailing",
"type": "boolean",
"title": "Рассылка"
},
{
"name": "created_at",
"type": "date",
"title": "Дата регистрации"
}
]
