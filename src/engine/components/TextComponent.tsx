"use client";

import React from "react";
import { ComponentRendererProps } from "./types";
import { DateCell } from "./DateCell";

export function renderText({
  props,
  className,
  style,
}: ComponentRendererProps) {
  const level = props.level as number | undefined;
  const value = props.value as string;

  // wrap-anywhere — принудительный перенос длинных слов (e-mail, имена),
  // чтобы текст не вылезал за пределы узких контейнеров
  const textClass = `wrap-anywhere ${className || ""}`.trim();

  // Колонки дат в тексте: dataType="date" — форматирование на клиенте
  // в поясе зрителя (паттерн — props.dateFormat или по умолчанию)
  const content =
    props.dataType === "date" ? (
      <DateCell
        value={value}
        pattern={(props.dateFormat as string) || undefined}
      />
    ) : (
      value
    );

  if (level === 1)
    return (
      <h1 className={textClass} style={style}>
        {content}
      </h1>
    );
  if (level === 2)
    return (
      <h2 className={textClass} style={style}>
        {content}
      </h2>
    );
  if (level === 3)
    return (
      <h3 className={textClass} style={style}>
        {content}
      </h3>
    );
  return (
    <p className={textClass} style={style}>
      {content}
    </p>
  );
}
