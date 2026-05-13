"use client";

import React from "react";
import { Checkbox } from "primereact/checkbox";
import { RadioButton } from "primereact/radiobutton";
import { InputSwitch } from "primereact/inputswitch";
import { Slider } from "primereact/slider";
import { Rating } from "primereact/rating";
import { ComponentRendererProps } from "./types";

export function renderCheckbox({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const checkboxProps = {
    ...props,
    checked: props.value ?? props.checked ?? false,
  };

  return (
    <div
      className={`${props?.inline ? "" : "field"} flex align-items-center ${className || ""}`}
    >
      <Checkbox
        {...checkboxProps}
        style={style}
        onChange={(e) => handleEvent("onChange", { value: e.checked })}
      />
      {props.label && <label className="ml-2">{props.label as string}</label>}
    </div>
  );
}

export function renderRadioButton({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const radioButtonProps = {
    ...props,
    value: props.value,
  };

  return (
    <div
      className={`${props?.inline ? "" : "field"} flex align-items-center ${className || ""}`}
    >
      <RadioButton
        {...radioButtonProps}
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
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const inputSwitchProps = {
    ...props,
    checked: props.value ?? props.checked ?? false,
  };

  return (
    <div
      className={`${props?.inline ? "" : "field"} flex align-items-center ${className || ""}`}
    >
      <InputSwitch
        {...inputSwitchProps}
        className="flex-grow-0 min-w-max"
        style={style}
        onChange={(e) => handleEvent("onChange", { value: e.value })}
      />
      {props.label && (
        <label className="ml-2 mb-0 text-200">{props.label as string}</label>
      )}
    </div>
  );
}

export function renderSlider({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const sliderProps = {
    ...props,
    value: props.value,
  };

  return (
    <Slider
      {...sliderProps}
      className={`${props?.inline ? "" : "field"} w-full ${className || ""}`}
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
