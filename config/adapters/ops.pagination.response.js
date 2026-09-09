/**
 * Адаптер для операционных данных промо-инстансов (пагинация)
 * Преобразует конверт { status: "ok", data: { items: [], total_items: N } } 
 * в формат DataTable { value: [], totalRecords: N }
 */
function transform(source) {
  // Если пришел конверт с status
  const payload = source.status === 'ok' ? source.data : source;
  
  return {
    value: payload.items || [],
    totalRecords: payload.total_items || 0,
    first: (payload.page - 1) * payload.limit || 0,
    rows: payload.limit || 10,
  };
}
