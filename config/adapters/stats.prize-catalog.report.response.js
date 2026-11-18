/**
 * Response adapter for the metadata GET of the "prize catalog" stats query
 * (GET ops/prize-catalog → /api/v1/crm/stats/query/prize-catalog with the
 * manual query_id "prize-catalog"; spec .prompts/prize-catalog.md).
 *
 * Fallback-first contract (same pattern as the reference users/receipts
 * metadata adapters and the transactions ones): while the backend does not
 * return its own fields/filters for the query (or the GET fails until the
 * query_id is registered), the adapter builds the page from the SPEC —
 * columns §3 (15 columns with the spec titles, sortable per the shared
 * PRIZE_CATALOG_SORTABLE_COLUMNS whitelist in _shared.js — the same map the
 * request adapter applies) and the two filter definitions §5.1 (options
 * «Видимость участнику» / «Наличие в плане CRM»; the DB 0/1 values behind
 * the opts positions live in PRIZE_CATALOG_FILTERS of the request adapter,
 * same order). When the server metadata carries fields/filters of its own —
 * the server ones are used.
 *
 * Passthrough mapping: columns come from fields[] (field ← name, header ←
 * title, dataType ← type date/datetime — the DataTable formats them in the
 * viewer timezone); SQL never leaves the backend; an invalid payload (error
 * object) falls back to the spec set — the page stays functional instead of
 * rendering without columns/filters.
 */
// Filter definitions of the spec §5.1 with UI labels (name is rendered by
// FiltersPanel and ActiveFiltersBar). The FiltersPanel value for "options"
// filters is a boolean array aligned with opts — the DB values behind the
// positions live in PRIZE_CATALOG_FILTERS of the request adapter (same
// order)
const PRIZE_CATALOG_FILTERS_FALLBACK = [
  {
    id: "active",
    name: "Видимость участнику",
    type: "options",
    opts: ["Видимые", "Скрытые"],
    value: null,
  },
  {
    id: "is_removed",
    name: "Наличие в плане CRM",
    type: "options",
    opts: ["В плане", "Вне плана"],
    value: null,
  },
];

// Fallback columns of the spec §3 (titles of the task; sortable flags come
// from the shared whitelist)
const PRIZE_CATALOG_COLUMNS_FALLBACK = [
  { field: "prize_id", header: "ID приза", type: "string" },
  { field: "code", header: "Код в CRM", type: "string" },
  { field: "type_code", header: "Группа (тип)", type: "string" },
  { field: "title", header: "Название", type: "string" },
  { field: "description", header: "Описание", type: "string" },
  { field: "price_rub", header: "Стоимость, ₽ (для акта)", type: "number" },
  { field: "points_cost", header: "Цена в баллах", type: "number" },
  { field: "act_required", header: "Нужен акт получения", type: "boolean" },
  { field: "active", header: "Видимость участнику", type: "boolean" },
  { field: "is_removed", header: "Нет в плане CRM", type: "boolean" },
  { field: "target_count", header: "Плановое кол-во экземпляров", type: "number" },
  { field: "image", header: "Картинка (локальный адрес)", type: "string" },
  { field: "image_source_url", header: "Источник картинки", type: "string" },
  { field: "created_at", header: "Дата создания", type: "datetime" },
  { field: "updated_at", header: "Дата обновления", type: "datetime" },
];

function transform(data) {
  const meta = data && data.status === "ok" ? data.data : data;
  if (!meta || typeof meta !== "object") {
    // Error object / empty payload — build the page from the spec (the
    // query_id may not be registered on the backend yet)
    return buildMeta(
      "",
      "",
      PRIZE_CATALOG_COLUMNS_FALLBACK.map(mapFallbackColumn),
      PRIZE_CATALOG_FILTERS_FALLBACK,
    );
  }

  const fields = Array.isArray(meta.fields) ? meta.fields : [];
  const serverFilters = Array.isArray(meta.filters) ? meta.filters : null;
  return buildMeta(
    meta.id || "",
    meta.title || "",
    fields.length
      ? fields.map(mapColumn)
      : PRIZE_CATALOG_COLUMNS_FALLBACK.map(mapFallbackColumn),
    serverFilters || PRIZE_CATALOG_FILTERS_FALLBACK,
  );
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
    sortable: field.sortable !== false && isPrizeCatalogSortable(field.name),
  };
  if (field.type === "date" || field.type === "datetime") {
    column.dataType = "date";
  }
  return column;
}

// Spec §3 fallback entry → display column (same rules, entry already holds
// field/header/type)
function mapFallbackColumn(entry) {
  const column = {
    field: entry.field,
    header: entry.header,
    sortable: isPrizeCatalogSortable(entry.field),
  };
  if (entry.type === "date" || entry.type === "datetime") {
    column.dataType = "date";
  }
  return column;
}