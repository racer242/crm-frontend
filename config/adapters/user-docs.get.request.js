/**
 * Request adapter для GET /users/[id]/docs
 * GET-запрос не требует параметров, но адаптер нужен для единообразия
 * @param {Object} params - Параметры запроса
 * @returns {Object} Параметры (без изменений)
 */
function transform(params = {}) {
  return params;
}
