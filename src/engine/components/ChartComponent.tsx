"use client";

import React from "react";
import { Chart } from "primereact/chart";
import { ComponentRendererProps } from "./types";

export function renderChart({
  props,
  className,
  style,
}: ComponentRendererProps) {
  return (
    <div className="mb-4">
      <Chart {...props} className={`${className || ""}`} style={style} />
    </div>
  );
}
