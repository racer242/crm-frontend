"use client";

import React from "react";
import { ComponentRendererProps } from "./types";
import { ComponentRenderer } from "../ComponentRenderer";
import { Component } from "@/types";

export function renderLayoutGroup(
  renderProps: ComponentRendererProps & Record<string, any>,
) {
  const { props, className, style } = renderProps;
  const { components, grid, ...restProps } = props;
  const componentList: Component[] = components || [];
  const gridConfig = grid;

  if (!componentList || componentList.length === 0) {
    return null;
  }

  if (gridConfig) {
    const gridContainerClass = [className || "", "grid"]
      .filter(Boolean)
      .join(" ");
    return (
      <div className={gridContainerClass} style={style}>
        {componentList
          .filter((c) => c !== null && c !== undefined)
          .map((component) => {
            const index = componentList.indexOf(component);
            const colClass = (gridConfig.cols && gridConfig.cols[index]) || "";
            const wrapperClasses = [colClass, gridConfig.padding]
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
    <div className={className} style={style}>
      {componentList
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
  const {
    components,
    label,
    labelClassName,
    labelStyle,
    containerClassName,
    grid,
    ...restProps
  } = props;
  const componentList: Component[] = components || [];
  const labelText: string = label || "";
  const labelClass: string = labelClassName || "font-semibold";
  const labelStl = labelStyle;
  const containerClass: string = containerClassName || "flex flex-column gap-2";
  const gridConfig = grid;

  const renderComponents = () => {
    if (!componentList || componentList.length === 0) {
      return null;
    }

    if (gridConfig) {
      const gridContainerClass = [containerClass, "grid"]
        .filter(Boolean)
        .join(" ");
      return (
        <div className={gridContainerClass}>
          {componentList
            .filter((c) => c !== null && c !== undefined)
            .map((component) => {
              const index = componentList.indexOf(component);
              const colClass =
                (gridConfig.cols && gridConfig.cols[index]) || "";
              const wrapperClasses = [colClass, gridConfig.padding]
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
      <div className={containerClass}>
        {componentList
          .filter((c) => c !== null && c !== undefined)
          .map((component) => (
            <ComponentRenderer key={component.id} component={component} />
          ))}
      </div>
    );
  };

  if (!labelText) {
    return (
      <div className={className} style={style} {...restProps}>
        {renderComponents()}
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <label className={labelClass} style={labelStl}>
        {labelText}
      </label>
      {renderComponents()}
    </div>
  );
}
