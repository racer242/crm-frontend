"use client";

import React from "react";
import { Checkbox } from "primereact/checkbox";
import { RadioButton } from "primereact/radiobutton";
import { InputSwitch } from "primereact/inputswitch";
import { Slider } from "primereact/slider";
import { Rating } from "primereact/rating";
import { ComponentRendererProps } from "./types";

export function renderCheckbox({
  component,
  props,
  className,
  style,
  resolvedValue,
  resolvedDisabled,
  resolvedVisible,
  handleEvent,
}: ComponentRendererProps) {
  const checkboxProps = {
    ...props,
    checked:
      resolvedValue !== undefined
        ? resolvedValue
        : component.state?.value || false,
    disabled: resolvedDisabled ?? props.disabled,
    visible: resolvedVisible ?? props.visible,
  };

  return (
    <div className="mb-2 flex align-items-center">
      <Checkbox
        {...checkboxProps}
        className={className}
        style={style}
        onChange={(e) => handleEvent("onChange", { value: e.checked })}
      />
      {props.label && (
        <label className="ml-2 text-200">{props.label as string}</label>
      )}
    </div>
  );
}

export function renderRadioButton({
  props,
  className,
  style,
  resolvedValue,
  resolvedDisabled,
  handleEvent,
}: ComponentRendererProps) {
  const radioButtonProps = {
    ...props,
    value: resolvedValue !== undefined ? resolvedValue : props.value,
    disabled: resolvedDisabled ?? props.disabled,
  };

  return (
    <div className="field flex align-items-center">
      <RadioButton
        {...radioButtonProps}
        className={className}
        style={style}
        onChange={(e) => handleEvent("onChange", { value: e.value })}
      />
      {props.label && (
        <label className="ml-2 text-200">{props.label as string}</label>
      )}
    </div>
  );
}

export function renderInputSwitch({
  component,
  props,
  className,
  style,
  resolvedValue,
  resolvedDisabled,
  resolvedVisible,
  handleEvent,
}: ComponentRendererProps) {
  const inputSwitchProps = {
    ...props,
    checked:
      resolvedValue !== undefined
        ? resolvedValue
        : component.state?.value || false,
    disabled: resolvedDisabled ?? props.disabled,
    visible: resolvedVisible ?? props.visible,
  };

  return (
    <div className="field flex align-items-center">
      <InputSwitch
        {...inputSwitchProps}
        className={className}
        style={style}
        onChange={(e) => handleEvent("onChange", { value: e.value })}
      />
      {props.label && (
        <label className="ml-2 text-200">{props.label as string}</label>
      )}
    </div>
  );
}

export function renderSlider({
  props,
  className,
  style,
  resolvedValue,
  resolvedDisabled,
  handleEvent,
}: ComponentRendererProps) {
  const sliderProps = {
    ...props,
    value: resolvedValue !== undefined ? resolvedValue : props.value,
    disabled: resolvedDisabled ?? props.disabled,
  };

  return (
    <Slider
      {...sliderProps}
      className={`field w-full ${className || ""}`}
      style={style}
      onChange={(e) => handleEvent("onChange", { value: e.value })}
    />
  );
}

export function renderRating({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  return (
    <Rating
      {...props}
      className={className}
      style={style}
      onChange={(e) => handleEvent("onChange", { value: e.value })}
    />
  );
}
