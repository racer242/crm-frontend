"use client";

import React from "react";
import { Message } from "primereact/message";
import { Divider } from "primereact/divider";
import { Timeline } from "primereact/timeline";
import { ComponentRendererProps } from "./types";

export function renderMessage({
  props,
  className,
  style,
}: ComponentRendererProps) {
  return (
    <Message {...props} className={`${className || ""} mb-3`} style={style} />
  );
}

export function renderDivider({
  props,
  className,
  style,
}: ComponentRendererProps) {
  return (
    <Divider {...props} className={`${className || ""} my-4`} style={style} />
  );
}

export function renderTimeline({
  props,
  className,
  style,
}: ComponentRendererProps) {
  const timelineValue = props.value || [];

  return (
    <div className={`${className || ""} mb-3`} style={style}>
      <Timeline
        value={timelineValue}
        content={(item: any) => (
          <div className="flex flex-column align-items-start">
            <span className="font-semibold text-100 mb-1">{item.status}</span>
            <small className="text-500">{item.date}</small>
          </div>
        )}
        marker={(item: any) => (
          <span
            className="flex w-2rem h-2rem align-items-center justify-content-center border-circle text-white"
            style={{
              backgroundColor: item.color || "var(--primary-color)",
            }}
          >
            <i className={item.icon} />
          </span>
        )}
      />
    </div>
  );
}
