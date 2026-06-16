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
  props: { title, value, icon, color, ...rest },
  className,
  style,
}: ComponentRendererProps) {
  return (
    <Card className={className} style={style} {...rest}>
      <div className="flex align-items-start justify-content-between">
        <div>
          <p className="text-500 text-sm mb-1">{title}</p>
          <span className="text-2xl font-bold">{value}</span>
        </div>
        {icon && (
          <i
            className={`${icon} text-2xl`}
            style={{ color: color || "var(--primary-color)" }}
          />
        )}
      </div>
    </Card>
  );
}
