"use client";

import React from "react";
import { ComponentRendererProps } from "./types";
import { ComponentRenderer } from "../ComponentRenderer";
import { useCampFeatures } from "../ComponentContext";
import { matchesFeatureGate } from "@/utils/campFeatures";
import { Component } from "@/types";

export function renderLayoutGroup(
  renderProps: ComponentRendererProps & Record<string, any>,
) {
  const { props, className, style } = renderProps;
  const { components, grid, ...restProps } = props;
  const campFeatures = useCampFeatures();
  const componentList: Component[] = components || [];
  const gridConfig = grid;

  if (!componentList || componentList.length === 0) {
    return null;
  }

  // Фича-гейт: скрытые компоненты исключаются ДО раскладки — иначе
  // grid-обёртка <div className={colClass}> осталась бы и занимала ячейку.
  // Колонки назначаются по фактическому составу: ряд сжимается без дыр.
  const visibleComponents = componentList.filter(
    (c) => c !== null && c !== undefined && matchesFeatureGate(campFeatures, c.feature),
  );

  // Все компоненты скрыты — группа не занимает место
  if (visibleComponents.length === 0) {
    return null;
  }

  if (gridConfig) {
    const gridContainerClass = [className || "", "grid"]
      .filter(Boolean)
      .join(" ");
    return (
      <div className={gridContainerClass} style={style}>
        {visibleComponents.map((component, index) => {
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
      {visibleComponents.map((component) => (
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
  const campFeatures = useCampFeatures();
  const componentList: Component[] = components || [];
  const labelText: string = label || "";
  const labelClass: string = labelClassName || "font-semibold";
  const labelStl = labelStyle;
  const containerClass: string = containerClassName || "flex flex-column gap-2";
  const gridConfig = grid;

  // Фича-гейт: скрытые компоненты исключаются ДО раскладки — иначе
  // grid-обёртка <div className={colClass}> осталась бы и занимала ячейку.
  // Колонки назначаются по фактическому составу: ряд сжимается без дыр.
  const visibleComponents = componentList.filter(
    (c) => c !== null && c !== undefined && matchesFeatureGate(campFeatures, c.feature),
  );

  // Все компоненты скрыты — группа не выводится (одинокий лейбл без содержимого)
  if (componentList.length > 0 && visibleComponents.length === 0) {
    return null;
  }

  const renderComponents = () => {
    if (!visibleComponents || visibleComponents.length === 0) {
      return null;
    }

    if (gridConfig) {
      const gridContainerClass = [containerClass, "grid"]
        .filter(Boolean)
        .join(" ");
      return (
        <div className={gridContainerClass}>
          {visibleComponents.map((component, index) => {
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
        {visibleComponents.map((component) => (
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
