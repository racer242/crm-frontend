/**
 * Response adapter for GET ops/receipts-v2/report/[report_id] — metadata of the
 * stats report «Просмотр чеков» for the experimental "Receipts (v2)" page
 * (spec .prompts/new_req_receipts.md, page query_id = "receipts").
 *
 * Returns ONLY safe data:
 *  - id, title of the report;
 *  - columns — display columns from fields[] ({field, header, sortable, dataType});
 *    the internal receipt_id/user_id (spec §3 — "для внутренних нужд") are
 *    dropped from the display set; sortable is true only for columns the report
 *    SQL can ORDER BY (the shared RECEIPTS_V2_SORTABLE_COLUMNS whitelist in
 *    _shared.js — the spec §4 sort map, the same list the request adapter
 *    applies); an explicit server-side sortable:false is respected too;
 *  - filters — filter definitions for FiltersPanel (hardcoded per §5 of the
 *    spec, while the server doesn't return them itself; when `filters` appears
 *    in the response — the server ones are used). Filter VALUES are mapped into
 *    replacement macros in stats.receipts.execute.request.js.
 *
 * The report `sql` and service fields (category, for_dashboard, view_type…) do
 * not go into the page state: the frontend receives only column types and names.
 */
// Filter definitions with UI labels (name is rendered by FiltersPanel and
// ActiveFiltersBar; spec §5). DB values behind the options are hardcoded in
// stats.receipts.execute.request.js (MODERATION_STATUS_VALUES /
// FNS_STATUS_VALUES / RETAIL_CHAIN_CODES + PERIOD_COLUMNS for the periods).
const RECEIPTS_FILTERS = [
  {
    id: "moderation_status",
    name: "Статус модерации",
    type: "options",
    opts: ["На проверке", "Принят", "Отклонён", "Отложен", "Требуется загрузка фото"],
    value: null,
  },
  {
    id: "fns_status",
    name: "Статус ФНС",
    type: "options",
    opts: ["Не проверен", "Ожидает ФНС", "Не найден в ФНС", "Чек корректный"],
    value: null,
  },
  {
    id: "registration_date",
    name: "Период регистрации",
    type: "period",
    opts: null,
    value: null,
  },
  {
    id: "purchase_date",
    name: "Период покупки",
    type: "period",
    opts: null,
    value: null,
  },
  {
    // range без opts: no slider, free «От»/«До» inputs (empty = bound not
    // set); both empty → no restriction (the users-page «Баланс баллов»
    // pattern; the spec's slider bounds [0, 10000] dropped 09.10.26)
    id: "promo_products_amount",
    name: "Сумма акционных продуктов, ₽",
    type: "range",
    opts: null,
    value: null,
  },
  {
    id: "has_promo_products",
    name: "Есть акционные продукты",
    type: "checkbox",
    opts: null,
    value: null,
  },
];

// Internal columns of the report SQL (spec §3): present in row values for the
// page navigation (user button / receipt card), never shown as table columns
const INTERNAL_COLUMNS = ["receipt_id", "user_id"];

function transform(source) {
  const data = source && source.status === "ok" ? source.data : source;
  if (!data || typeof data !== "object") return data;

  const fields = Array.isArray(data.fields) ? data.fields : [];

  return {
    id: data.id,
    title: data.title,
    columns: fields
      .filter((f) => f && f.name && INTERNAL_COLUMNS.indexOf(f.name) < 0)
      .map((f) => ({
        field: f.name,
        header: f.title || f.name,
        // Sorting is offered only for columns the report SQL can ORDER BY
        // (shared RECEIPTS_V2_SORTABLE_COLUMNS whitelist in _shared.js — the
        // spec §4 sort map); an explicit server-side sortable:false is
        // respected too
        sortable: f.sortable !== false && isReceiptsV2Sortable(f.name),
        dataType:
          f.type === "date" || f.type === "datetime" ? "date" : undefined,
      })),
    filters: Array.isArray(data.filters) ? data.filters : RECEIPTS_FILTERS,
  };
}