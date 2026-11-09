/**
 * Request adapter for executing the "participant rating" stats query of the
 * avito_to_the_top campaign (route POST ops/users-v2/rating/execute →
 * /api/v1/crm/stats/query/user-avito/execute, format json; the query is
 * addressed by the manual query_id "user-avito",
 * SQL: .prompts/user-page-sql1-update.md).
 *
 * The query takes a single macro {{USER_ID}} — the UUID of the promo-instance
 * participant (bot_users.user_id); the card page (/ops/users/[user_id])
 * passes it through the dataFeed data.user_id ({$location.routeParams.user_id}).
 * The query SQL wraps it into UUID_TO_BIN({{USER_ID}}); the value is quoted
 * through sqlString (apostrophes doubled).
 *
 * The query returns ONE row (or zero rows — the participant has no bot_users
 * record; the query doc explicitly calls this a normal situation for the
 * frontend); the stats execute contract still requires page/limit — defaults
 * are sent. Output: { page, limit, replacements }.
 */
const MACRO_KEYS = ["USER_ID"];

function transform(params = {}) {
  const replacements = {};
  MACRO_KEYS.forEach((key) => {
    replacements[key] = "";
  });
  const id = String((params && params.user_id) || "").trim();
  if (id) {
    replacements.USER_ID = sqlString(id);
  }
  return { page: 1, limit: 10, replacements };
}