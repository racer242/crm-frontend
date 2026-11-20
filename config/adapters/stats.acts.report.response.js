/**
 * Response adapter for the metadata GET of the "acts" stats query
 * (GET ops/acts → /api/v1/crm/stats/query/acts with the manual query_id
 * "acts"; spec .prompts/acts.md — отчёт «Акты получения призов»:
 * prize_instances + prize_catalog + user + user_extended + user_documents).
 *
 * Fallback-first contract (same pattern as the reference users/receipts/
 * prizes/transactions metadata adapters): while the backend does not return
 * its own fields/filters for the query (or the GET fails until the query_id
 * is registered), the adapter builds the page from the SPEC — table columns
 * §3 (with the spec titles; sortable per the shared ACTS_SORTABLE_COLUMNS
 * whitelist in _shared.js — the same list the request adapter applies;
 * act_scan_original_name/act_scan_mime/act_scan_stored_name/full_name are
 * not sortable) and the 17 filter definitions §5.1: act_status options
 * (the DB values behind the opts positions live in ACTS_FILTERS of the
 * request adapter, same order), has_file checkbox, 11 document flags in
 * the «Есть»/«Нет» options format (tri-state: only «Есть» → the IS NOT
 * NULL fragment, only «Нет» → IS NULL, both/neither → no restriction; the
 * fragments live in ACTS_FILTERS of the request adapter, same order;
 * «Акт требуется» is NOT a filter by the user's decision — the key
 * ACT_REQUIRED_FILTER stays in the request replacements and is always
 * empty), prize options with EMPTY opts until the server metadata carries
 * the dynamic prize list (spec §5.1: «opts заполняются динамически»), the
 * price range over pc.price and the act_uploaded_date/issued_date periods.
 * When the server metadata carries fields/filters of its own — the server
 * ones are used.
 *
 * Table exclusion: instance_id is NOT rendered as a table column (the raw
 * UUID is of no use in the list — the row carries it for navigation: the
 * arrow column and the row click navigate to /ops/acts/{instance_id});
 * act_scan_mime/act_scan_stored_name are служебные поля файла (§9.3 спеки —
 * «при внешней выгрузке убирайте»; наружу показывается
 * act_scan_original_name). All three are filtered out of BOTH the spec
 * fallback and the server fields (same pattern as the prizes/
 * prize-catalog popup-only fields), so the table shape does not change when
 * the backend starts returning its own fields[]. The values themselves keep
 * flowing through the execute-response row mapping unchanged.
 *
 * Passthrough mapping: columns come from fields[] (field ← name, header ←
 * title, dataType ← type date/datetime/uuid); SQL never leaves the
 * backend; an invalid payload (error object) falls back to the spec set —
 * the page stays functional instead of rendering without columns/filters.
 */
// Filter definitions of the spec §5.1 with UI labels (name is rendered by
// FiltersPanel and ActiveFiltersBar)
const ACTS_FILTERS_FALLBACK = [
  {
    id: "act_status",
    name: "Статус акта",
    type: "options",
    opts: ["Ожидает загрузки", "Акт загружен", "Подтверждён", "Отклонён"],
    value: null,
  },
  {
    id: "has_file",
    name: "Файл акта загружен",
    type: "checkbox",
    value: null,
  },
  // Document flags §5.1 → «Есть»/«Нет» options (renames by the user's
  // feedback): the value is a boolean array aligned with opts — only
  // «Есть» selected → trueSql of ACTS_FILTERS (request adapter), only
  // «Нет» → falseSql, both/neither → no restriction
  {
    id: "has_passport",
    name: "Паспорт: серия и номер",
    type: "options",
    opts: ["Есть", "Нет"],
    value: null,
  },
  {
    id: "has_passport_issue_date",
    name: "Паспорт: дата выдачи",
    type: "options",
    opts: ["Есть", "Нет"],
    value: null,
  },
  {
    id: "has_passport_issued_by",
    name: "Паспорт: кем выдан",
    type: "options",
    opts: ["Есть", "Нет"],
    value: null,
  },
  {
    id: "has_address",
    name: "Паспорт: Адрес регистрации",
    type: "options",
    opts: ["Есть", "Нет"],
    value: null,
  },
  {
    id: "has_inn",
    name: "ИНН",
    type: "options",
    opts: ["Есть", "Нет"],
    value: null,
  },
  {
    id: "has_snils",
    name: "СНИЛС",
    type: "options",
    opts: ["Есть", "Нет"],
    value: null,
  },
  {
    id: "has_agreement",
    name: "Согласие",
    type: "options",
    opts: ["Есть", "Нет"],
    value: null,
  },
  {
    id: "has_passport_main_scan",
    name: "Паспорт: скан основной",
    type: "options",
    opts: ["Есть", "Нет"],
    value: null,
  },
  {
    id: "has_passport_reg_scan",
    name: "Паспорт: скан регистрации",
    type: "options",
    opts: ["Есть", "Нет"],
    value: null,
  },
  {
    id: "has_inn_scan",
    name: "ИНН: скан",
    type: "options",
    opts: ["Есть", "Нет"],
    value: null,
  },
  {
    id: "has_snils_scan",
    name: "СНИЛС: скан",
    type: "options",
    opts: ["Есть", "Нет"],
    value: null,
  },
  {
    id: "prize",
    name: "Приз",
    type: "options",
    // §5.1 «opts заполняются динамически» — список призов, требующих акт,
    // приходит серверными метаданными; до них фильтр без пунктов
    opts: [],
    value: null,
  },
  {
    id: "price",
    name: "Стоимость приза, ₽",
    type: "range",
    column: "pc.price",
    opts: [0, 500000],
    value: null,
  },
  {
    id: "act_uploaded_date",
    name: "Период загрузки акта",
    type: "period",
    column: "pi.act_scan_uploaded_at",
    value: null,
  },
  {
    id: "issued_date",
    name: "Период выдачи приза",
    type: "period",
    column: "pi.issued_at",
    value: null,
  },
];
// Fallback columns of the spec §3 (full list; sortable flags come from the
// shared whitelist)
const ACTS_COLUMNS_FALLBACK = [
  { field: "act_status", header: "Статус акта", type: "string" },
  { field: "act_state", header: "Состояние акта (сводно)", type: "string" },
  {
    field: "act_scan_uploaded_at",
    header: "Дата загрузки акта",
    type: "datetime",
  },
  { field: "days_on_review", header: "Дней на проверке", type: "number" },
  { field: "act_file_present", header: "Файл акта загружен", type: "boolean" },
  { field: "act_scan_original_name", header: "Файл акта", type: "string" },
  {
    field: "act_scan_size",
    header: "Размер файла акта, байт",
    type: "number",
  },
  { field: "act_required", header: "Акт требуется", type: "boolean" },
  { field: "prize_code", header: "Код приза в CRM", type: "string" },
  { field: "prize_title", header: "Название приза", type: "string" },
  { field: "type_code", header: "Группа (тип)", type: "string" },
  { field: "price_rub", header: "Стоимость, ₽ (для акта)", type: "number" },
  { field: "user_id", header: "ID владельца", type: "uuid" },
  { field: "participant_code", header: "Код участника", type: "string" },
  { field: "full_name", header: "ФИО владельца", type: "string" },
  { field: "email", header: "Email владельца", type: "string" },
  { field: "has_passport", header: "Паспорт: серия и номер", type: "boolean" },
  {
    field: "has_passport_issue_date",
    header: "Паспорт: дата выдачи",
    type: "boolean",
  },
  {
    field: "has_passport_issued_by",
    header: "Паспорт: кем выдан",
    type: "boolean",
  },
  { field: "has_address", header: "Адрес регистрации", type: "boolean" },
  { field: "has_inn", header: "ИНН", type: "boolean" },
  { field: "has_snils", header: "СНИЛС", type: "boolean" },
  { field: "has_agreement", header: "Согласие", type: "boolean" },
  {
    field: "has_passport_main_scan",
    header: "Скан: паспорт (основной)",
    type: "boolean",
  },
  {
    field: "has_passport_reg_scan",
    header: "Скан: паспорт (регистрация)",
    type: "boolean",
  },
  { field: "has_inn_scan", header: "Скан: ИНН", type: "boolean" },
  { field: "has_snils_scan", header: "Скан: СНИЛС", type: "boolean" },
  { field: "issued_at", header: "Дата выдачи приза", type: "datetime" },
  { field: "status", header: "Статус приза", type: "string" },
  { field: "pool_status", header: "Статус в пуле", type: "string" },
  { field: "external_id", header: "ID во внешней системе", type: "string" },
  {
    field: "created_at",
    header: "Дата создания экземпляра",
    type: "datetime",
  },
];
// Fields NOT rendered as table columns: instance_id — the raw UUID is of no
// use in the list (the row carries it for navigation: the arrow column and
// the row click navigate to /ops/acts/{instance_id}); act_scan_mime/
// act_scan_stored_name — служебные поля файла акта (§9.3 спеки). Excluded
// from BOTH the spec fallback and the server metadata (same pattern as the
// prizes/prize-catalog popup-only fields), so the table shape does not
// change when the backend starts returning its own fields[]
const ACTS_HIDDEN_FIELDS = [
  "instance_id",
  "act_scan_mime",
  "act_scan_stored_name",
];

function transform(data) {
  const meta = data && data.status === "ok" ? data.data : data;
  if (!meta || typeof meta !== "object") {
    // Error object / empty payload — build the page from the spec (the
    // query_id may not be registered on the backend yet)
    return buildMeta(
      "",
      "",
      ACTS_COLUMNS_FALLBACK.filter(notHidden).map(mapFallbackColumn),
      ACTS_FILTERS_FALLBACK,
    );
  }

  const fields = Array.isArray(meta.fields) ? meta.fields : [];
  const serverFilters = Array.isArray(meta.filters) ? meta.filters : null;
  return buildMeta(
    meta.id || "",
    meta.title || "",
    fields.length
      ? fields.filter(notHidden).map(mapColumn)
      : ACTS_COLUMNS_FALLBACK.filter(notHidden).map(mapFallbackColumn),
    serverFilters || ACTS_FILTERS_FALLBACK,
  );
}

// Hidden fields are excluded from the table columns regardless of the
// source; server entries carry `name`, fallback entries — `field`
function notHidden(entry) {
  const key = (entry && (entry.name || entry.field)) || "";
  return ACTS_HIDDEN_FIELDS.indexOf(String(key)) < 0;
}

function buildMeta(id, title, columns, filters) {
  return { id, title, columns, filters };
}

// Server field → display column (sortable per the shared whitelist, an
// explicit server-side sortable:false is respected)
function mapColumn(field) {
  if (!field || typeof field !== "object") return field;
  const column = {
    field: field.name,
    header: field.title || field.name,
    sortable: field.sortable !== false && isActsSortable(field.name),
  };
  if (field.type === "date" || field.type === "datetime") {
    column.dataType = "date";
  }
  if (field.type === "uuid") {
    column.dataType = "uuid";
  }
  return column;
}

// Spec §3 fallback entry → display column (same rules, entry already holds
// field/header/type)
function mapFallbackColumn(entry) {
  const column = {
    field: entry.field,
    header: entry.header,
    sortable: isActsSortable(entry.field),
  };
  if (entry.type === "date" || entry.type === "datetime") {
    column.dataType = "date";
  }
  if (entry.type === "uuid") {
    column.dataType = "uuid";
  }
  return column;
}