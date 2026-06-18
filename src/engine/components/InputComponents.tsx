"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { InputMask } from "primereact/inputmask";
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

  const [localValue, setLocalValue] = useState(inputProps.value);
  const isFirstRender = useRef(true);

  // Синхронизация с внешним value (из dataFeed, setProperty и т.д.)
  // Пропускаем первый рендер, чтобы не затереть начальное значение из useState
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLocalValue(inputProps.value);
  }, [inputProps.value]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocalValue(val);
      handleEvent("onChange", { value: val });
    },
    [handleEvent],
  );

  return (
    <InputText
      {...inputProps}
      value={localValue}
      className={`${props?.inline ? "" : "field"} w-full ${className || ""}`}
      style={style}
      onChange={onChange}
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

  const [localValue, setLocalValue] = useState(inputNumberProps.value);
  const isFirstRender = useRef(true);

  // Синхронизация с внешним value (из dataFeed, setProperty и т.д.)
  // Пропускаем первый рендер, чтобы не затереть начальное значение из useState
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLocalValue(inputNumberProps.value);
  }, [inputNumberProps.value]);

  const onValueChange = useCallback(
    (e: any) => {
      const val = e.value;
      setLocalValue(val);
      handleEvent("onChange", { value: val });
    },
    [handleEvent],
  );

  return (
    <InputNumber
      {...inputNumberProps}
      value={localValue}
      className={`${props?.inline ? "" : "field"} w-full ${className || ""}`}
      style={style}
      onValueChange={onValueChange}
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

  const [localValue, setLocalValue] = useState(textareaProps.value);
  const isFirstRender = useRef(true);

  // Синхронизация с внешним value (из dataFeed, setProperty и т.д.)
  // Пропускаем первый рендер, чтобы не затереть начальное значение из useState
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLocalValue(textareaProps.value);
  }, [textareaProps.value]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setLocalValue(val);
      handleEvent("onChange", { value: val });
    },
    [handleEvent],
  );

  return (
    <InputTextarea
      {...textareaProps}
      value={localValue}
      className={`${props?.inline ? "" : "field"} w-full ${className || ""}`}
      style={style}
      onChange={onChange}
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

  const [localValue, setLocalValue] = useState(passwordProps.value);
  const isFirstRender = useRef(true);

  // Синхронизация с внешним value (из dataFeed, setProperty и т.д.)
  // Пропускаем первый рендер, чтобы не затереть начальное значение из useState
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLocalValue(passwordProps.value);
  }, [passwordProps.value]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocalValue(val);
      handleEvent("onChange", { value: val });
    },
    [handleEvent],
  );

  return (
    <Password
      {...passwordProps}
      value={localValue}
      className={`${props?.inline ? "" : "field"} w-full ${className || ""}`}
      style={style}
      onChange={onChange}
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
      <Button {...buttonProps} icon={ButtonIcon} onClick={handleButtonClick} />
    </div>
  );
}

/**
 * InputMask — поле ввода с маской на основе primereact/inputmask.
 *
 * Props:
 * - mask: string — маска ввода (например "(999) 999-9999" для телефона, "99/99/9999" для даты)
 * - slotChar: string — символ заполнителя (по умолчанию "_")
 * - autoClear: boolean — автоочистка при потере фокуса (по умолчанию true)
 * - inline: string — если "true", убирает класс "field"
 * - Все остальные пропсы InputMask из PrimeReact
 *
 * События:
 * - onChange → { value: e.value }
 *
 * Пример использования в JSON-конфиге:
 * {
 *   "id": "phoneInput",
 *   "componentType": "InputMask",
 *   "props": {
 *     "mask": "(999) 999-9999",
 *     "placeholder": "Введите телефон",
 *     "slotChar": "_"
 *   },
 *   "events": [
 *     {
 *       "type": "onChange",
 *       "commands": [
 *         {
 *           "type": "setProperty",
 *           "params": { "source": "event.value", "target": "state.phone" }
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
export function renderInputMask({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const inputMaskProps = {
    ...props,
    value: props.value ?? "",
  };

  const [localValue, setLocalValue] = useState(inputMaskProps.value);
  const isFirstRender = useRef(true);

  // Синхронизация с внешним value (из dataFeed, setProperty и т.д.)
  // Пропускаем первый рендер, чтобы не затереть начальное значение из useState
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLocalValue(inputMaskProps.value);
  }, [inputMaskProps.value]);

  const onChange = useCallback(
    (e: any) => {
      const val = e.value;
      setLocalValue(val);
      handleEvent("onChange", { value: val });
    },
    [handleEvent],
  );

  return (
    <InputMask
      {...inputMaskProps}
      value={localValue}
      className={`${props?.inline ? "" : "field"} w-full ${className || ""}`}
      style={style}
      onChange={onChange}
    />
  );
}
