"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { ComponentRendererProps } from "./types";

export function renderInputText({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const inputProps = {
    ...props,
    value: props.value ?? "",
  };

  return (
    <InputText
      {...inputProps}
      className={`${props?.inline ? "" : "field"} w-full ${className || ""}`}
      style={style}
      onChange={(e) => handleEvent("onChange", { value: e.target.value })}
    />
  );
}

export function renderInputNumber({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const inputNumberProps = {
    ...props,
    value: props.value ?? 0,
  };

  return (
    <InputNumber
      {...inputNumberProps}
      className={`${props?.inline ? "" : "field"} w-full ${className || ""}`}
      style={style}
      onValueChange={(e) => handleEvent("onChange", { value: e.value })}
    />
  );
}

export function renderInputTextarea({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const textareaProps = {
    ...props,
    value: props.value ?? "",
  };

  return (
    <InputTextarea
      {...textareaProps}
      className={`${props?.inline ? "" : "field"} w-full ${className || ""}`}
      style={style}
      onChange={(e) => handleEvent("onChange", { value: e.target.value })}
    />
  );
}

export function renderPassword({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const passwordProps = {
    ...props,
    value: props.value ?? "",
  };

  return (
    <Password
      {...passwordProps}
      className={`${props?.inline ? "" : "field"} w-full ${className || ""}`}
      style={style}
      onChange={(e) => handleEvent("onChange", { value: e.target.value })}
    />
  );
}

/**
 * InputTextWithThrottle — InputText с задержкой вызова onChange
 *
 * Props:
 * - throttleDelay: number — задержка в мс (по умолч. 300)
 * - Остальные пропсы как у InputText
 */
export function renderInputTextWithThrottle({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  // Извлекаем throttleDelay, чтобы не передавать его в DOM-элемент
  const { throttleDelay, ...inputProps } = props || {};
  const delay = throttleDelay ?? 300;
  const [localValue, setLocalValue] = useState(inputProps?.value ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Синхронизация с внешним value при изменении
  useEffect(() => {
    setLocalValue(inputProps?.value ?? "");
  }, [inputProps?.value]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocalValue(val);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        handleEvent("onChange", { value: val });
      }, delay);
    },
    [delay, handleEvent],
  );

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <InputText
      {...inputProps}
      value={localValue}
      className={`${inputProps?.inline ? "" : "field"} w-full ${className || ""}`}
      style={style}
      onChange={onChange}
    />
  );
}

/**
 * InputTextWithButton — InputText с кнопкой в InputGroup стиле
 *
 * Props:
 * - button: { icon?: string, label?: string, severity?: string, outlined?: boolean, className?: string }
 * - Остальные пропсы как у InputText
 *
 * Событие onClick кнопки генерирует handleEvent("onClick", { value: props.value })
 */
export function renderInputTextWithButton({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const inputProps = {
    ...props,
    value: props.value ?? "",
  };

  const buttonProps = props?.button || {};
  const ButtonIcon = buttonProps.icon || "pi pi-search";

  const handleButtonClick = useCallback(() => {
    handleEvent("onClick", { value: props.value });
  }, [handleEvent, props.value]);

  return (
    <div
      className={`${props?.inline ? "" : "field"} p-inputgroup ${className || ""}`}
      style={style}
    >
      <InputText
        {...inputProps}
        className="w-full"
        onChange={(e) => handleEvent("onChange", { value: e.target.value })}
      />
      <Button
        {...buttonProps}
        icon={ButtonIcon}
        // label={buttonProps.label}
        // severity={buttonProps.severity || "primary"}
        // outlined={buttonProps.outlined ?? true}
        // className={buttonProps.className || ""}
        onClick={handleButtonClick}
      />
    </div>
  );
}
