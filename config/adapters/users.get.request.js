/**
 * Адаптер запроса для списка участников (ops/users)
 * Преобразует параметры пагинации и фильтры из формата таблицы в формат API инстанса
 */
function transform(params = {}) {
  const { event = {}, ...base } = params;

  // 1. Слияние: event переопределяет base только если значение передано явно
  const merged = {
    first: event.first !== undefined ? event.first : base.first,
    rows: event.rows !== undefined ? event.rows : base.rows,
  };

  const first = Number(merged.first) || 0;
  // 25 — совпадает с опцией rowsPerPageOptions [5,10,25,50] страниц списков:
  // иначе ответ (rows=20 вне опций) не отображается в селекторе пагинации PrimeReact 10
  const rows = Number(merged.rows) || 25;

  // Вычисляем номер страницы (API использует 1-based index)
  const page = Math.floor(first / rows) + 1;

  const result = {
    page: page,
    limit: rows,
  };

  // Добавляем поиск, если он задан
  if (base.search) {
    result.search = base.search;
  }

  // Добавляем фильтр по статусу, если он задан
  if (base.status) {
    result.status = base.status;
  }

  // Пробрасываем фильтр по участнику (общий список чеков 2.11: user_id+status)
  if (base.user_id) {
    result.user_id = base.user_id;
  }

  return result;
}
