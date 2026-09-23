/**
 * Request-адаптер редактирования розыгрыша
 * (ops/raffles/[raffle_id] PATCH → /api/v1/crm/raffles/{id}, §8.4).
 * Плоские поля формы из state ({name, chance_source_type, collection_from,
 * collection_to}) → тело PATCH с вложенным периодом {collection_period:{from,to}}.
 */
function transform(data) {
  const d = data || {};

  const body = {};
  if (d.name !== undefined && d.name !== null) {
    body.name = String(d.name);
  }
  if (d.chance_source_type) {
    body.chance_source_type = d.chance_source_type;
  }

  const period = {};
  if (d.collection_from) period.from = d.collection_from;
  if (d.collection_to) period.to = d.collection_to;
  if (Object.keys(period).length > 0) {
    body.collection_period = period;
  }

  return body;
}