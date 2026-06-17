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
  const containerClassName: string =
    props.containerClassName || "flex flex-column gap-2";

  const renderContent = () => {
    if (!components || components.length === 0) {
      return null;
    }

    if (grid) {
      const gridContainerClass = [containerClassName, "grid"]
        .filter(Boolean)
        .join(" ");
      return (
        <div className={gridContainerClass}>
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
      <div className={containerClassName}>
        {components
          .filter((c) => c !== null && c !== undefined)
          .map((component) => (
            <ComponentRenderer key={component.id} component={component} />
          ))}
      </div>
    );
  };

  return (
    <div className={className} style={style}>
      {renderContent()}
    </div>
  );
}

export function renderLabelledGroup(
  renderProps: ComponentRendererProps & Record<string, any>,
) {
  const { props, className, style } = renderProps;
  const components: Component[] = props.components || [];
  const label: string = props.label || "";
  const labelClassName: string = props.labelClassName || "font-semibold";
  const labelStyle = props.labelStyle;
  const containerClassName: string =
    props.containerClassName || "flex flex-column gap-2";
  const grid = props.grid;

  const renderComponents = () => {
    if (!components || components.length === 0) {
      return null;
    }

    if (grid) {
      const gridContainerClass = [containerClassName, "grid"]
        .filter(Boolean)
        .join(" ");
      return (
        <div className={gridContainerClass}>
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
      <div className={containerClassName}>
        {components
          .filter((c) => c !== null && c !== undefined)
          .map((component) => (
            <ComponentRenderer key={component.id} component={component} />
          ))}
      </div>
    );
  };

  if (!label) {
    return (
      <div className={className} style={style}>
        {renderComponents()}
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <label className={labelClassName} style={labelStyle}>
        {label}
      </label>
      {renderComponents()}
    </div>
  );
}
