"use client";

import React from "react";
import { ProgressBar } from "primereact/progressbar";
import { ProgressSpinner } from "primereact/progressspinner";
import { ComponentRendererProps } from "./types";

export function renderProgressBar({
  props,
  className,
  style,
}: ComponentRendererProps) {
  return (
    <ProgressBar
      {...props}
      className={`${className || ""} mb-3`}
      style={style}
    />
  );
}

export function renderProgressSpinner({
  props,
  className,
  style,
}: ComponentRendererProps) {
  return (
    <div className="flex justify-content-center mb-3">
      <ProgressSpinner {...props} className={className} style={style} />
    </div>
  );
}
