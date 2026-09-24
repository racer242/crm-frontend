/**
 * Адаптер ответа «Посчитать шансы»
 * (ops/raffles/chances/count → GET /api/v1/crm/raffles/[id]/chances/count, §8.10).
 * Разворачивает конверт и приводит ответ к { count } — число шансов,
 * подпадающих под условия розыгрыша. Допускает варианты ответа:
 * {count}, {total}, число, {items, total_items}.
 */
function transform(response) {
  const data = (response && response.data) !== undefined ? response.data : response;

  let count = null;
  if (typeof data === "number") {
    count = data;
  } else if (data && typeof data === "object") {
    count =
      data.count !== undefined && data.count !== null
        ? data.count
        : data.total !== undefined && data.total !== null
          ? data.total
          : data.total_items !== undefined && data.total_items !== null
            ? data.total_items
            : Array.isArray(data.items)
              ? data.items.length
              : null;
  }

  return { count: count === null ? 0 : count };
}