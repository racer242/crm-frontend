"use client";

import React from "react";
import { Chart } from "primereact/chart";
import { Skeleton } from "primereact/skeleton";
import { ComponentRendererProps } from "./types";

export function renderChart({
  props,
  className,
  style,
  isMounted,
}: ComponentRendererProps) {
  if (!isMounted) return <Skeleton width="100%" height="20rem" />;

  return (
    <div className="mb-4">
      <Chart {...props} className={`${className || ""}`} style={style} />
    </div>
  );
}
