"use client";

import React from "react";
import { Card } from "primereact/card";
import { ComponentRendererProps } from "./types";

export function renderCard({
  component,
  props,
  className,
  style,
}: ComponentRendererProps) {
  return <Card {...props} className={className || ""} style={style}></Card>;
}

export function renderStatCard({
  component,
  props: {
    title,
    subTitle,
    value,
    icon,
    iconColor,
    titleClassName = "text-xl font-semibold line-height-1 mb-0",
    subTitleClassName = "text-xs line-height-1 mb-0",
    valueClassName = "text-4xl font-bold mt-4",
    iconClassName = "text-4xl",
    ...rest
  },
  className,
  style,
}: ComponentRendererProps) {
  return (
    <Card
      className={className}
      style={style}
      pt={{ content: { className: "p-0" } }}
      {...rest}
    >
      <div className="flex align-items-start justify-content-between">
        <div className="flex flex-column">
          <p className={titleClassName}>{title}</p>
          {subTitle && <p className={subTitleClassName}>{subTitle}</p>}
          <span className={valueClassName}>{value}</span>
        </div>
        {icon && (
          <i
            className={`${icon} ${iconClassName} ml-3`}
            style={{ color: iconColor || "var(--primary-color)" }}
          />
        )}
      </div>
    </Card>
  );
}
