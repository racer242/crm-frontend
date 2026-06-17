"use client";

import React from "react";
import { Card } from "primereact/card";
import { ComponentRendererProps } from "./types";

export function renderCard({
  component,
  props: { components, ...restProps },
  className,
  style,
}: ComponentRendererProps) {
  return <Card {...restProps} className={className || ""} style={style}></Card>;
}

export function renderStatCard({
  component,
  props: {
    title,
    subTitle,
    value,
    icon,
    iconColor,
    titleClassName = "text-xl font-semibold line-height-1",
    subTitleClassName = "text-xs line-height-1",
    valueClassName = "text-5xl font-bold mt-4 line-height-1",
    iconClassName = "text-3xl",
    ...rest
  },
  className,
  style,
}: ComponentRendererProps) {
  return (
    <Card
      className={className + " flex"}
      style={style}
      pt={{
        content: { className: "p-0 flex w-full" },
        body: { className: "flex w-full" },
      }}
      {...rest}
    >
      <div className="w-full flex align-items-stretch justify-content-between">
        <div className="h-full flex flex-column justify-content-between">
          <div className="flex flex-column gap-1">
            <div className={titleClassName}>{title}</div>
            {subTitle && <div className={subTitleClassName}>{subTitle}</div>}
          </div>
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
