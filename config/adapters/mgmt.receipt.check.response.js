/**
 * Response-адаптер POST /api/receipts/[id]/check — проверка чека, канал management.
 *
 * Сервер присылает только результат проверки в decline_reason:
 * - чек принят: decline_reason == null;
 * - чек отклонён: decline_reason != null и содержит причину (§4.3).
 * Поле moderation_status в ответе — всегда ТЕКУЩИЙ статус чека (проверка его
 * не меняет), результата проверки в нём нет. Адаптер подменяет его на статус,
 * выведенный из decline_reason:
 * - decline_reason пуст (null / "") → "ACCEPTED";
 * - decline_reason заполнен → "REFUSED".
 * Остальные поля (success, message, fns_status, decline_reason) проходят как есть.
 *
 * @param {Object} data - Ответ сервера
 * @returns {Object} Ответ с moderation_status, соответствующим результату проверки
 */
function transform(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  const declined =
    data.decline_reason !== undefined &&
    data.decline_reason !== null &&
    data.decline_reason !== "";
  return {
    ...data,
    moderation_status: declined ? "REFUSED" : "ACCEPTED",
  };
}