/**
 * settings.campaign.response — адаптер ответа GET /api/v1/crm/settings?group=campaign
 * (CRM API §3.6.1 — настройки инстанса, группа «Кампания»).
 *
 * Вход:  конверт { status: "ok", data: { campaign: { campaign_name,
 *        campaign_start_date, campaign_end_date, site_timezone } } }
 * Выход: { startDate, endDate } — значения для предзаполнения датапикеров
 *        статистики (target: state.params / state.campaign).
 *
 * null в датах API («без ограничения») → пустая строка: пикер остаётся пустым,
 * сервер при запуске сам применит дефолты, если replacements не переданы.
 */
function transform(data) {
  const campaign =
    data && data.data && data.data.campaign ? data.data.campaign : {};

  return {
    startDate: campaign.campaign_start_date || "",
    endDate: campaign.campaign_end_date || "",
  };
}