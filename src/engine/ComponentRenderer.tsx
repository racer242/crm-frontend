"use client";

import React from "react";
import { Component, App } from "@/types";
import { ElementIndex } from "@/core";
import { useComponentBindings } from "./hooks/useComponentBindings";
import {
  renderText,
  renderInputText,
  renderInputNumber,
  renderInputTextarea,
  renderPassword,
  renderDropdown,
  renderMultiSelect,
  renderAutoComplete,
  renderCalendar,
  renderCheckbox,
  renderRadioButton,
  renderInputSwitch,
  renderSlider,
  renderRating,
  renderColorPicker,
  renderFileUpload,
  renderButton,
  renderDataTable,
  renderCard,
  renderToast,
  renderMenubar,
  renderBreadcrumb,
  renderSteps,
  renderTabView,
  renderAccordion,
  renderCarousel,
  renderSkeleton,
  renderChip,
  renderAvatar,
  renderBadge,
  renderTag,
  renderProgressBar,
  renderProgressSpinner,
  renderMessage,
  renderDivider,
  renderTimeline,
  renderChart,
} from "./components";

export function ComponentRenderer({
  component,
  pageId,
  appConfig,
  stateManager,
  elementIndex,
  showToast,
  navigate,
  confirm,
}: {
  component: Component;
  pageId?: string;
  appConfig?: App;
  stateManager?: any;
  elementIndex?: ElementIndex;
  showToast?: (
    message: string,
    severity?: "success" | "info" | "warn" | "error",
  ) => void;
  navigate?: (url: string) => void;
  confirm?: (message: string) => Promise<boolean>;
}) {
  const { componentType, className, style } = component;

  console.log(
    "1111111111111",
    component.id,
    className,
    style,
    pageId,
    appConfig,
    stateManager,
    elementIndex,
    showToast,
    navigate,
    confirm,
  );

  const { resolvedProps, isMounted, handleEvent } = useComponentBindings({
    component,
    pageId,
    appConfig,
    stateManager,
    elementIndex,
    showToast,
    navigate,
    confirm,
  });

  console.log(
    "22222222222222",
    component.id,
    resolvedProps.className,
    resolvedProps.style,
    resolvedProps.pageId,
    resolvedProps.appConfig,
    resolvedProps.stateManager,
    resolvedProps.elementIndex,
    resolvedProps.showToast,
    resolvedProps.navigate,
    resolvedProps.confirm,
  );

  // resolvedProps уже содержит value и все props с разрешёнными bindings
  const renderProps = {
    component,
    props: resolvedProps,
    className,
    style,
    pageId,
    appConfig,
    stateManager,
    elementIndex,
    showToast,
    navigate,
    confirm,
    resolvedValue: resolvedProps.value,
    resolvedVisible: resolvedProps.visible,
    resolvedDisabled: resolvedProps.disabled,
    isMounted,
    handleEvent,
  };

  switch (componentType) {
    case "Text":
      return renderText(renderProps);
    case "InputText":
      return renderInputText(renderProps);
    case "InputNumber":
      return renderInputNumber(renderProps);
    case "InputTextarea":
      return renderInputTextarea(renderProps);
    case "Password":
      return renderPassword(renderProps);
    case "Dropdown":
      return renderDropdown(renderProps);
    case "MultiSelect":
      return renderMultiSelect(renderProps);
    case "AutoComplete":
      return renderAutoComplete(renderProps);
    case "Calendar":
      return renderCalendar(renderProps);
    case "Checkbox":
      return renderCheckbox(renderProps);
    case "RadioButton":
      return renderRadioButton(renderProps);
    case "InputSwitch":
      return renderInputSwitch(renderProps);
    case "Slider":
      return renderSlider(renderProps);
    case "Rating":
      return renderRating(renderProps);
    case "ColorPicker":
      return renderColorPicker(renderProps);
    case "FileUpload":
      return renderFileUpload(renderProps);
    case "Button":
      return renderButton(renderProps);
    case "DataTable":
      return renderDataTable(renderProps);
    case "Card":
      return renderCard(renderProps);
    case "Toast":
      return renderToast(renderProps);
    case "Menubar":
      return renderMenubar(renderProps);
    case "Breadcrumb":
      return renderBreadcrumb(renderProps);
    case "TabView":
      return renderTabView(renderProps);
    case "Steps":
      return renderSteps(renderProps);
    case "Accordion":
      return renderAccordion(renderProps);
    case "Carousel":
      return renderCarousel(renderProps);
    case "Skeleton":
      return renderSkeleton(renderProps);
    case "Chip":
      return renderChip(renderProps);
    case "Avatar":
      return renderAvatar(renderProps);
    case "Badge":
      return renderBadge(renderProps);
    case "Tag":
      return renderTag(renderProps);
    case "ProgressBar":
      return renderProgressBar(renderProps);
    case "ProgressSpinner":
      return renderProgressSpinner(renderProps);
    case "Message":
      return renderMessage(renderProps);
    case "Divider":
      return renderDivider(renderProps);
    case "Timeline":
      return renderTimeline(renderProps);
    case "Chart":
      return renderChart(renderProps);
    default:
      return (
        <div className={className} style={style}>
          <p className="text-500 text-sm">
            [Component: {componentType} - Not implemented]
          </p>
        </div>
      );
  }
}
