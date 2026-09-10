/**
 * Базовый универсальный адаптер пагинации для инстансов
 */
function transform(source) {
  const payload = source.status === 'ok' ? source.data : source;
  
  return {
    value: payload.items || [],
    totalRecords: payload.pagination?.total_items || 0,
    first: ((payload.pagination?.page || 1) - 1) * (payload.pagination?.limit || 20),
    rows: payload.pagination?.limit || 20,
  };
}
