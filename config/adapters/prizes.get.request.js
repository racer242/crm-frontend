/**
 * Адаптер запроса для списков призов (ops/prizes, ops/users/[user_id]/prizes)
 * Преобразует параметры пагинации, поиск и фильтры со страницы
 * в плоские параметры API инстанса (§7.1, обновление 29.09.26 §1.1):
 * page/limit + search + status + act_required (задел: owner, raffle_id).
 */
function transform(params = {}) {
  const { event = {}, ...base } = params;

  // 1. Слияние: event переопределяет base только если значение передано явно
  const merged = {
    first: event.first !== undefined ? event.first : base.first,
    rows: event.rows !== undefined ? event.rows : base.rows,
    search: event.search !== undefined ? event.search : base.search,
    status: event.status !== undefined ? event.status : base.status,
    act_required:
      event.act_required !== undefined ? event.act_required : base.act_required,
    owner: event.owner !== undefined ? event.owner : base.owner,
    raffle_id: event.raffle_id !== undefined ? event.raffle_id : base.raffle_id,
  };

  const first = Number(merged.first) || 0;
  // 25 — совпадает с опцией rowsPerPageOptions [5,10,25,50] страниц списков:
  // иначе ответ (rows=20 вне опций) не отображается в селекторе пагинации PrimeReact 10
  const rows = Number(merged.rows) || 25;
  const page = Math.floor(first / rows) + 1;

  const result = {
    page: page,
    limit: rows,
  };

  // Единый поиск по всем опознавательным признакам (§1.1)
  if (merged.search) {
    result.search = merged.search;
  }

  // Фильтр по статусу выдачи (PENDING/ACT_UPLOADED/APPROVED/REJECTED)
  if (merged.status) {
    result.status = merged.status;
  }

  // Требование акта: 1 — только требующие акта, 0 — только без акта (§1.1);
  // Dropdown отдаёт строки "1"/"0", пустое значение (сброс) не отправляем
  if (
    merged.act_required === "1" ||
    merged.act_required === 1 ||
    merged.act_required === true
  ) {
    result.act_required = 1;
  } else if (
    merged.act_required === "0" ||
    merged.act_required === 0 ||
    merged.act_required === false
  ) {
    result.act_required = 0;
  }

  // Наличие владельца: 1 — только выданные призы, 0 — только свободные (§1.1);
  // Dropdown отдаёт строки "1"/"0", пустое значение (сброс) не отправляем.
  // raffle_id — задел на фильтр §1.1, пока не выведен в UI
  if (
    merged.owner === "1" ||
    merged.owner === 1 ||
    merged.owner === "0" ||
    merged.owner === 0
  ) {
    result.owner = Number(merged.owner);
  }
  if (merged.raffle_id) {
    result.raffle_id = merged.raffle_id;
  }

  return result;
}

