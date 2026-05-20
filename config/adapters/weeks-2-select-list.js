/**
 * Преобразует массив {title, start, end} в формат для селектов/форм
 * @param {Array} data - исходный массив
 * @param {number} [idFallback] - значение id, если в title нет числа (по умолчанию: индекс + 1)
 * @returns {Array}
 */
function transform(data, idFallback = null) {
  return data.map((item, index) => {
    // 1. Извлечение id с fallback
    const match = item.title.match(/\d+/);
    const id = match ? parseInt(match[0], 10) : (idFallback ?? index + 1);

    // 2. Форматирование даты YYYY-MM-DD → DD.MM.YYYY
    const formatDate = (iso) => {
      if (!iso) return "";
      const [year, month, day] = iso.split("-");
      return `${day}.${month}.${year}`;
    };

    // 3. Сборка результата
    return {
      label: item.title, // В точности соответствует исходному title
      value: {
        id,
        start: formatDate(item.start),
        end: formatDate(item.end),
      },
    };
  });
}

/*
Из
[
  {"title":"Неделя 1", "start":"2026-04-01", "end":"2026-04-07"},
  ...
]
в
[
  {
    "label": "Неделя 11 - 16.03.2026 - 23.03.2026",
    "value": {
      "id": 11,
      "start": "16.03.2026",
      "end": "23.03.2026"
    }
  },
  ...
]
 */
