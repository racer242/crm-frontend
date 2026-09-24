/**
 * Request-адаптер редактирования розыгрыша
 * (ops/raffles/[raffle_id] PATCH → /api/v1/crm/raffles/{id}, §8.4).
 * Плоские поля формы из state ({name, source_types, collection_from,
 * collection_to}) → тело PATCH с массивом источников шансов source_types
 * и плоскими датами периода сбора (как в актуальных ответах GET).
 */
function transform(data) {
  const d = data || {};

  const body = {};
  if (d.name !== undefined && d.name !== null) {
    body.name = String(d.name);
  }
  // Тип: пустая строка → null (в API поле допускает null).
  if (d.type !== undefined && d.type !== null) {
    body.type = d.type === "" ? null : String(d.type);
  }
  if (Array.isArray(d.source_types)) {
    body.source_types = d.source_types;
  }
  if (d.publish_at) {
    body.publish_at = d.publish_at;
  }
  if (d.collection_from) body.collection_from = d.collection_from;
  if (d.collection_to) body.collection_to = d.collection_to;

  return body;
}