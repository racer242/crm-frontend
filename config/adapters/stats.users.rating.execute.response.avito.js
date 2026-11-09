/**
 * Response adapter for executing the "participant rating" stats query of the
 * avito_to_the_top campaign (POST ops/users-v2/rating/execute →
 * /api/v1/crm/stats/query/user-avito/execute; SQL:
 * .prompts/user-page-sql1-update.md).
 *
 * The query returns ONE row (or zero — no bot_users record; the doc calls
 * this a normal situation) with the fields:
 *   avito_id, telegram_id,
 *   category_name / league_name — names from dict_category/dict_league
 *   (LEFT JOIN by code, COALESCE falls back to the raw code),
 *   place — the place in the rating among active participants of the same
 *   category+league (place = above + 1),
 *   better_than_percent — the share of participants with a lower balance.
 *
 * Output — a flat object for the state.userRating of the participant card:
 * the detailsTable rows bind to @state.userRating.*. An empty/null field →
 * an empty string (the row stays empty). better_than_percent_label — a
 * composed phrase for the row "Результат лучше, чем у N% участников".
 */
function transform(source) {
  const payload = source && source.status === "ok" ? source.data : source;
  // Current stats execute format: {items, pagination}; the future
  // rows[]/values{} contract is supported the same way as in the reference
  // stats.users.execute.response.js
  const items = Array.isArray(payload && payload.items)
    ? payload.items
    : Array.isArray(payload && payload.rows)
      ? payload.rows.map((r) => (r && r.values ? r.values : r))
      : [];
  const row =
    items.length > 0 && items[0] && typeof items[0] === "object"
      ? items[0]
      : null;

  const str = (v) => (v === undefined || v === null ? "" : String(v));
  const percent = row ? row.better_than_percent : undefined;
  return {
    avito_id: str(row && row.avito_id),
    telegram_id: str(row && row.telegram_id),
    category_name: str(row && row.category_name),
    league_name: str(row && row.league_name),
    place: str(row && row.place),
    better_than_percent: str(percent),
    better_than_percent_label:
      percent === undefined || percent === null || percent === ""
        ? ""
        : str(percent) + "% участников",
  };
}

return transform(data);