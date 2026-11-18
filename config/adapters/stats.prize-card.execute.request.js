/**
 * Request adapter for the card stats queries of the prize card page
 * (POST ops/prizes-card/{details|raffle|act}/execute →
 * /api/v1/crm/stats/query/{prize-details|prize-raffle|prize-act}/execute;
 * SQL: .prompts/prize.md — «Карточка приза: три запроса вместо одного»).
 *
 * ONE request adapter for all three routes — the request contract of the
 * card queries is identical (precedent: prizes.get.request is shared by
 * two routes): a single macro INSTANCE_ID_FILTER = the instance UUID IN
 * QUOTES (the report SQL wraps the value in UUID_TO_BIN({{INSTANCE_ID}})
 * itself — the substituted value is the quoted string, §0 of the spec),
 * page = 1, limit = 1 always (§0: a card query, no pagination), no other
 * macros/search/sort.
 *
 * instance_id comes from the page (base.instance_id = the
 * {$location.routeParams.prize_id} route parameter); the event merge of
 * the list adapters is not needed — the card has no table events. The
 * value is validated with UUID_RE (§0); invalid/empty → an empty key (the
 * server answers 422, the panels stay empty) — the user-transactions
 * convention (missing USER_ID → empty key); the spec §0 sample throws on
 * an invalid UUID — the adapter degrades instead of throwing, the card
 * stays renderable.
 *
 * Output: { page: 1, limit: 1, replacements }. The routes are marked
 * query: true — the entire result goes into the query.
 */
const INSTANCE_ID_KEY = "INSTANCE_ID_FILTER";
const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function transform(params = {}) {
  // The macro is always present — a missing key gives 422
  const replacements = {};
  replacements[INSTANCE_ID_KEY] = "";
  const raw = String((params && params.instance_id) || "").trim();
  if (UUID_RE.test(raw)) {
    replacements[INSTANCE_ID_KEY] = "'" + raw.toLowerCase() + "'";
  }
  return { page: 1, limit: 1, replacements };
}