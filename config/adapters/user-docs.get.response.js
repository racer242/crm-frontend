/**
 * Адаптер для страниц документов участника
 * (ops/users/[user_id]/docs → GET /api/v1/crm/users/{user_id})
 * Применяется API-роутером (маршрут ops/users/[user_id]/docs), поэтому на вход
 * может прийти как обёртка { status, data }, так и чистые данные профиля.
 *
 * Формирует данные для панелей «Паспорт», «ИНН», «СНИЛС», хлебных крошек
 * и таблицы «Документы» (extra.documents → строки {type, label, file_id, url}).
 *
 * @param {Object} response - Ответ сервера (обёртка { status, data } или чистые данные)
 * @returns {Object} Преобразованные данные для State
 */
function transform(response) {
  const data = (response && response.data) || response || {};
  if (!data || typeof data !== "object") return {};

  const extra = data.extra || {};
  const personal = extra.personal || {};
  const extended = extra.extended || {};

  // Подписи типов документов (ключ extra.documents = тип)
  const documentLabels = {
    passport_main: "Паспорт (первая страница)",
    passport_reg: "Паспорт (разворот регистрации)",
    inn_scan: "Свидетельство ИНН",
    snils_scan: "Свидетельство СНИЛС",
  };

  // Документы: объект { тип: { file_id, url } } → массив строк для DataTable
  const documentsSource = extra.documents || {};
  const documents = Object.keys(documentsSource)
    .map(function (type) {
      const doc = documentsSource[type];
      if (!doc || typeof doc !== "object") return null;
      return {
        type: type,
        label: documentLabels[type] || type,
        file_id: doc.file_id || "",
        url: doc.url || "",
      };
    })
    .filter(Boolean);

  const firstName = data.first_name || "";
  const lastName = data.last_name || "";
  const participantCode = data.participant_code || "";
  const fullName =
    [lastName, firstName].filter(Boolean).join(" ") ||
    "Без имени (" + participantCode + ")";

  return {
    id: data.id || "",
    participant_code: participantCode,
    fullName: fullName,

    // Паспортные данные: ФИО — extra.personal (first_name/last_name/third_name),
    // остальные — extra.extended. В API полей personal.passport_* нет.
    passport_first_name: personal.first_name || "",
    passport_last_name: personal.last_name || "",
    passport_middle_name: personal.third_name || "",
    passport_series_number: extended.passport_series_number || "",
    passport_issued_by: extended.passport_issued_by || "",
    // Сырое значение — его же отправляет PATCH (форма редактирования)
    passport_issue_date: extended.passport_issue_date || "",
    passport_registration_address: extended.passport_address || "",

    // ИНН / СНИЛС
    inn: extended.inn || "",
    snils: extended.snils || "",

    // Согласие на обработку персональных данных
    agreement: extra.agreement === true,

    // Документы
    documents: documents,
    documents_count: documents.length,
  };
}

