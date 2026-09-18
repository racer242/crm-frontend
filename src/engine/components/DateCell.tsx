"use client";

import React from "react";
import { formatDateByPattern, DEFAULT_DATETIME_PATTERN } from "../../utils/dateFormat";

/**
 * Ячейка/текст с датой, форматируемой на клиенте.
 * SSR-безопасно: на сервере и при первом клиентском рендере показывается
 * сырое значение (как пришло от адаптера), после гидратации —
 * форматированное в часовом поясе зрителя (без hydration-mismatch).
 * Паттерн задаётся в конфиге (dateFormat, токены DD/MM/YYYY/HH/mm/ss),
 * по умолчанию — DD.MM.YYYY HH:mm.
 */
export function DateCell({
  value,
  pattern,
}: {
  value: unknown;
  pattern?: string;
}) {
  const [formatted, setFormatted] = React.useState<string>(() =>
    value === null || value === undefined ? "" : String(value),
  );
  React.useEffect(() => {
    setFormatted(formatDateByPattern(value, pattern || DEFAULT_DATETIME_PATTERN));
  }, [value, pattern]);
  return <span suppressHydrationWarning>{formatted}</span>;
}
