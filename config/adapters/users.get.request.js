/**
 * Адаптер запроса для списка участников (ops/users)
 * Преобразует параметры пагинации и фильтры из формата таблицы в формат API инстанса
 */
function transform(data) {
  const first = Number(data.first) || 0;
  const rows = Number(data.rows) || 20;
  
  // Вычисляем номер страницы (API использует 1-based index)
  const page = Math.floor(first / rows) + 1;

  const result = {
    page: page,
    limit: rows,
  };

  // Добавляем поиск, если он задан
  if (data.search) {
    result.search = data.search;
  }

  // Добавляем фильтр по статусу, если он задан
  if (data.status) {
    result.status = data.status;
  }

  return result;
}
