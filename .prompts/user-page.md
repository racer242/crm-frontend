страница config\pages\promo-instance\user.json
Надо сделать патч этой страницы для кампании avito_to_the_top.
Сейчас страница принимает данные из стандартного запроса.
Пример лога:

------ Request -- GET https://avito-prod.botpromo.ru/api/v1/crm/users/01a1c048-835a-7be0-99ca-7439c620be03
------ Headers -- {
"Content-Type": "application/json",
"Accept": "application/json",
"X-Crm-Key-Id": "crm-next",
"X-Crm-Signature": "403e6f31c0886f143bb201dfce46e64e7ea90176bf2da6b8b503426f16c69876",
"X-Crm-Timestamp": "1794233291",
"X-Crm-Nonce": "101516f40864d9f9fc27264fed181132",
"X-Exchange-Version": "0.0.0"
}
------ Body -- (empty)
------ Query -- {}
------ Response -- Response {
status: 200,
statusText: 'OK',
headers: Headers {
server: 'nginx/1.28.3 (Ubuntu)',
'content-type': 'application/json',
'transfer-encoding': 'chunked',
connection: 'keep-alive',
'cache-control': 'no-cache, private',
date: 'Mon, 09 Nov 2026 14:08:11 GMT',
'x-instance-version': '0'
},
body: ReadableStream { locked: false, state: 'readable', supportsBYOB: true },
bodyUsed: false,
ok: true,
redirected: false,
type: 'default',
url: 'https://avito-prod.botpromo.ru/api/v1/crm/users/01a1c048-835a-7be0-99ca-7439c620be03'
}
------ Response Data--
{
status: 'ok',
data: {
id: '01a1c048-835a-7be0-99ca-7439c620be03',
participant_code: '97WFXWXF',
email: 'Kpigurnov@mail.ru',
status: 'active',
created_at: '2026-11-09T15:29:00+03:00',
first_name: 'Константин',
last_name: 'Пигурнов',
third_name: null,
phone: '+79228462028',
city_id: null,
city: null,
mailing: '0',
points: 0,
payload: { avito_id: '145626859', category: 'Passenger' },
telegram_id: null,
telegram_registered_at: null,
extra: {
personal: {
first_name: 'Константин',
last_name: 'Пигурнов',
third_name: null
},
extended: {
inn: null,
snils: null,
passport_series_number: null,
passport_issue_date: null,
passport_issued_by: null,
passport_address: null
},
agreement: false,
documents: []
}
}
}

я хочу добавить запрос, который будет добавлять следующие параметры:
Avito ID
Telegram ID
Категория
Лига
Место в рейтинге
Результат лучше чем у XX% участников

место в рейтинге и результат лучше чем... определяются по этому фрагменту кода:
...
const peers = await this.users.listActiveByCategoryAndLeague(user.categoryCode, user.leagueCode);
const above = peers.filter((peer) => peer.balance > user.balance).length;
const total = peers.length;
const below = total - above - 1;
return {
place: above + 1,
total,
betterThanPercent: total > 1 ? Math.max(0, Math.floor((below / total) \* 100)) : 0,
};
...

Описание запроса указано здесь:
.prompts\user-page-sql1.md

Эти параметры будут добавлены в панель detailsTable.

Ниже основной секции, новая секция:
Таблица "Задания" в которой выводятся все задания, со столбцами, включающими все параметры задания. Предполагается только сортировка по столбцам.
Описание запроса тут:
.prompts\user-page-sql2.md
