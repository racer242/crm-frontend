/**
 * Адаптер запроса выгрузки отчёта в xlsx (POST ops/stats/reports/[id]/export).
 *
 * §5.6 ТЗ: format передаётся в теле запроса; page/limit для xlsx не используются
 * (выгрузка — «файл целиком, без ограничения по строкам»).
 *
 * Период (startDate/endDate) отправляется как есть в параметре replacements:
 * { format: "xlsx", replacements: { "startDate": "...", "endDate": "..." } }.
 * Пустые даты в replacements не включаются. Замену макросов
 * {{startDate}}/{{endDate}} в SQL выполняет сервер API перед запуском.
 */
function transform(params = {}) {
  const result = { format: "xlsx" };
  if (params.startDate || params.endDate) {
    result.replacements = {};
    if (params.startDate) {
      result.replacements.startDate = params.startDate;
    }
    if (params.endDate) {
      result.replacements.endDate = params.endDate;
    }
  }

  return result;
}
