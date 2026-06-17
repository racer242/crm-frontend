"use client";

import React from "react";
import { ComponentRendererProps } from "./types";
import { ComponentRenderer } from "../ComponentRenderer";
import { Component } from "@/types";

export function renderLayoutGroup(
  renderProps: ComponentRendererProps & Record<string, any>,
) {
  const { props, className, style } = renderProps;
  const components: Component[] = props.components || [];
  const grid = props.grid;

  const containerClassName = grid
    ? [className || "", "grid"].filter(Boolean).join(" ")
    : className || "flex flex-column gap-2";

  if (!components || components.length === 0) {
    return <div className={containerClassName} style={style}></div>;
  }

  if (grid) {
    return (
      <div className={containerClassName} style={style}>
        {components
          .filter((c) => c !== null && c !== undefined)
          .map((component) => {
            const index = components.indexOf(component);
            const colClass = (grid.cols && grid.cols[index]) || "";
            const wrapperClasses = [colClass, grid.padding]
              .filter(Boolean)
              .join(" ");
            return (
              <div key={component.id} className={wrapperClasses}>
                <ComponentRenderer component={component} />
              </div>
            );
          })}
      </div>
    );
  }

  return (
    <div className={containerClassName} style={style}>
      {components
        .filter((c) => c !== null && c !== undefined)
        .map((component) => (
          <ComponentRenderer key={component.id} component={component} />
        ))}
    </div>
  );
}

export function renderLabelledGroup(
  renderProps: ComponentRendererProps & Record<string, any>,
) {
  const { props, className, style } = renderProps;
  const components: Component[] = props.components || [];
  const label: string = props.label || "";
  const labelPosition: "top" | "left" = props.labelPosition || "top";
  const labelClassName: string = props.labelClassName || "font-semibold";
  const labelStyle = props.labelStyle;

  const grid = props.grid;

  const containerClassName = grid
    ? [className || "", "grid"].filter(Boolean).join(" ")
    : className || "flex flex-column gap-2";

  const renderComponents = () => {
    if (!components || components.length === 0) {
      return null;
    }

    if (grid) {
      return (
        <div className={containerClassName} style={style}>
          {components
            .filter((c) => c !== null && c !== undefined)
            .map((component) => {
              const index = components.indexOf(component);
              const colClass = (grid.cols && grid.cols[index]) || "";
              const wrapperClasses = [colClass, grid.padding]
                .filter(Boolean)
                .join(" ");
              return (
                <div key={component.id} className={wrapperClasses}>
                  <ComponentRenderer component={component} />
                </div>
              );
            })}
        </div>
      );
    }

    return (
      <div className={containerClassName} style={style}>
        {components
          .filter((c) => c !== null && c !== undefined)
          .map((component) => (
            <ComponentRenderer key={component.id} component={component} />
          ))}
      </div>
    );
  };

  if (!label) {
    return renderComponents();
  }

  if (labelPosition === "left") {
    return (
      <div className="flex align-items-start gap-3" style={style}>
        <label
          className={labelClassName}
          style={{
            minWidth: 120,
            flexShrink: 0,
            ...(labelStyle || {}),
          }}
        >
          {label}
        </label>
        <div className="flex-1">{renderComponents()}</div>
      </div>
    );
  }

  // labelPosition === "top"
  return (
    <div>
      <label className={labelClassName} style={labelStyle}>
        {label}
      </label>
      {renderComponents()}
    </div>
  );
}
