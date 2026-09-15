/**
 * Адаптер для деталей чека (ops/receipts/[receipt_id] → GET /api/v1/crm/receipts/{id})
 * Преобразует ответ API в формат для отображения на страницах просмотра (user-receipt)
 * и модерации (user-receipt-edit).
 * В page dataFeed адаптер не указывается — его применяет API-роутер,
 * поэтому на вход может прийти как обёртка { status, data }, так и данные.
 * @param {Object} response - Ответ сервера (обёртка { status, data } или чистые данные)
 * @returns {Object} Преобразованные данные для State
 */
function transform(response) {
  const data = (response && response.data) || response || {};
  if (!data || typeof data !== "object") return {};

  // Словарь статусов чека (русские лейблы + severity для Tag).
  // В API статусы приходят в верхнем регистре (CHECKING, ACCEPTED, ...) —
  // ключи словаря в нижнем регистре, нормализация ниже.
  const statusLabels = {
    checking: "На проверке",
    accepted: "Принят",
    refused: "Отклонён",
    suspended: "Приостановлен",
    need_photo: "Требуется фото",
  };
  const statusSeverities = {
    checking: "info",
    accepted: "success",
    refused: "danger",
    suspended: "warning",
    need_photo: "warning",
  };
  const statusKey = String(data.status || "").toLowerCase();

  // Фото чека: массив { file_id, url } + порядковый номер для таблицы.
  // url переписывается на файловый прокси (роутер добавит Bearer+HMAC),
  // сырой путь из API сохраняется в url_raw.
  const photos = (Array.isArray(data.photos) ? data.photos : []).map(
    (photo, index) => ({
      ...photo,
      url_raw: photo.url || "",
      url: proxyFileUrl(photo.url),
      n: index + 1,
    }),
  );

  return {
    id: data.receipt_id || "",
    receipt_id: data.receipt_id || "",
    user_id: data.user_id || "",
    status: data.status || "",
    status_label: statusLabels[statusKey] || data.status || "",
    status_severity: statusSeverities[statusKey] || "secondary",
    // Фискальные данные
    fn: data.fn || "",
    fp: data.fp || "",
    fd: data.fd || "",
    // Сумма приходит в копейках — форматирование в рубли (sum_label)
    sum: data.sum !== undefined && data.sum !== null ? data.sum : "",
    sum_label: formatSum(data.sum),
    date: data.date || "",
    date_formatted: data.date ? convertDateValue(data.date) : "",
    registered_at: data.registered_at || "",
    registered_at_formatted: data.registered_at
      ? convertDateValue(data.registered_at)
      : "",
    photos,
    photos_count: photos.length,
    photos_label: photos.length ? `Фото чека (${photos.length})` : "—",
  };
}

/**
 * Переписывает путь файла из ответа API на универсальный файловый прокси
 * (/api/ops/files/<путь> → {crm_api_url}/api/v1/crm/<путь>).
 * Абсолютные URL (уже содержащие схему) не трогает.
 */
function proxyFileUrl(url) {
  if (!url || typeof url !== "string" || /^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
    return url || "";
  }
  return "/api/ops/files" + url;
}

/**
 * Форматирует сумму из копеек в рубли («1 234,56 ₽»)
 */
function formatSum(sum) {
  if (sum === undefined || sum === null || sum === "") return "—";
  const value = Number(sum);
  if (isNaN(value)) return String(sum);
  return (
    (value / 100)
      .toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      // toLocaleString('ru-RU') использует неразрывный пробел (U+00A0) —
      // нормализуем к обычному пробелу для одинакового вывода в Node и браузере
      .replace(/\u00A0/g, " ") + " ₽"
  );
}
