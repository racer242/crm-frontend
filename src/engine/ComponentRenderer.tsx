"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Component, App } from "@/types";
import { useComponentBindings } from "./hooks/useComponentBindings";
import {
  renderText,
  renderInputText,
  renderInputNumber,
  renderInputTextarea,
  renderPassword,
  renderInputTextWithThrottle,
  renderInputTextWithButton,
  renderInputMask,
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
  renderStatCard,
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
  renderFiltersPanel,
  renderActiveFiltersBar,
  renderLayoutGroup,
  renderLabelledGroup,
  renderPanel,
  renderImage,
} from "./components";

export function ComponentRenderer({ component }: { component: Component }) {
  const t = useTranslations("component");
  const tf = useTranslations("filters");
  const { componentType, className, style } = component;

  const { resolvedProps, handleEvent } = useComponentBindings({
    component,
  });

  const renderProps = {
    component,
    props: resolvedProps,
    className,
    style,
    handleEvent,
    t: tf,
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
    case "InputTextWithThrottle":
      return renderInputTextWithThrottle(renderProps);
    case "InputTextWithButton":
      return renderInputTextWithButton(renderProps);
    case "InputMask":
      return renderInputMask(renderProps);
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
    case "StatCard":
      return renderStatCard(renderProps);
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
    case "FiltersPanel":
      return renderFiltersPanel(renderProps);
    case "ActiveFiltersBar":
      return renderActiveFiltersBar(renderProps);
    case "LayoutGroup":
      return renderLayoutGroup(renderProps);
    case "LabelledGroup":
      return renderLabelledGroup(renderProps);
    case "Panel":
      return renderPanel(renderProps);
    case "Image":
      return renderImage(renderProps);
    default:
      return (
        <div className={className} style={style}>
          <p className="text-500 text-sm">
            {t("notImplemented", { type: componentType })}
          </p>
        </div>
      );
  }
}
