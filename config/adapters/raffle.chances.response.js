/**
 * Адаптер шансов розыгрыша (ops/raffles/[raffle_id]/chances →
 * GET /api/v1/crm/raffles/{id}/chances, §8.9).
 * Ответ API ({status:"ok", data:{items, pagination}}) → формат lazy-таблицы
 * {value, columns, totalRecords, first, rows}.
 * Колонки строятся из ФАКТИЧЕСКИХ полей ответа («все актуальные поля шанса»):
 * известные поля получают русские заголовки и типы (uuid → сокращённый
 * формат, date → форматирование в поясе зрителя), дополнительные поля
 * добавляются в конце с заголовком из имени ключа. Логические значения
 * выводятся как Да/Нет, источники шансов — лейблами из справочника инстанса.
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;
  const items = payload.items || [];

  // Лейблы типов источников шансов (настройка инстанса raffle_chance_source_types).
  const sourceLabels = {
    receipt: "Чек",
    promo_code: "Промокод",
    gtin_code: "Код GTIN",
    game_win: "Победа в игре",
    points_purchase: "Покупка за баллы",
    manual: "Вручную",
  };

  const formatValue = (field, v) => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "boolean") return v ? "Да" : "Нет";
    if (field === "source_type") return sourceLabels[v] || v;
    if (typeof v === "object") return JSON.stringify(v);
    return v;
  };

  const value = items.map((item) => {
    const row = {};
    Object.keys(item || {}).forEach((key) => {
      row[key] = formatValue(key, item[key]);
    });
    return row;
  });

  // Заголовки и типы известных полей шанса (§8.8/8.9/8.13/8.16) в фиксированном порядке.
  const known = [
    { field: "chance_id", header: "ID шанса", dataType: "uuid", width: "10rem" },
    { field: "user_id", header: "ID участника", dataType: "uuid", width: "10rem" },
    { field: "received_at", header: "Дата получения", dataType: "date", width: "12rem" },
    { field: "source_type", header: "Источник", width: "12rem" },
    { field: "raffle_id", header: "ID розыгрыша", dataType: "uuid", width: "10rem" },
    { field: "is_winning", header: "Выигрышный", width: "10rem" },
    { field: "is_winner", header: "Победитель", width: "10rem" },
    { field: "booked_at", header: "Дата бронирования", dataType: "date", width: "12rem" },
    { field: "status", header: "Статус", width: "11rem" },
  ];

  // Фактический набор ключей ответа (объединение по всем строкам).
  const restKeys = new Set();
  items.forEach((item) => {
    Object.keys(item || {}).forEach((key) => restKeys.add(key));
  });

  const columns = [];
  known.forEach((col) => {
    if (restKeys.has(col.field)) {
      columns.push(col);
      restKeys.delete(col.field);
    }
  });
  // Дополнительные поля API, которых нет в справочнике выше, — в конце таблицы.
  restKeys.forEach((key) => {
    columns.push({ field: key, header: key.replace(/_/g, " ") });
  });

  return {
    value,
    columns,
    totalRecords: payload.pagination?.total_items || value.length,
    first:
      ((payload.pagination?.page || 1) - 1) * (payload.pagination?.limit || 10),
    rows: payload.pagination?.limit || 10,
  };
}