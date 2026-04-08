"use client";

import React from "react";
import { Component } from "@/types";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Card } from "primereact/card";
import { Toast } from "primereact/toast";
import { useRef } from "react";

/**
 * ComponentRenderer - рендит компонент PrimeReact на основе его типа
 */
export function ComponentRenderer({ component }: { component: Component }) {
  const { componentType, props = {}, className, style } = component;
  const toastRef = useRef<Toast>(null);

  // Обработка событий
  const handleEvent = (eventType: string, eventValue: any) => {
    if (!component.events) return;

    const eventHandlers = component.events.filter((e) => e.event === eventType);
    
    eventHandlers.forEach((handler) => {
      if (handler.preventDefault) {
        // preventDefault логика
      }
      if (handler.stopPropagation) {
        // stopPropagation логика
      }

      // Выполнение команд (заглушка для future implementation)
      handler.commands.forEach((cmd) => {
        console.log(`[Command] ${cmd.type}:`, cmd.params);
      });
    });
  };

  // Рендер компонента по типу
  switch (componentType) {
    case "Text":
      const level = props.level as number | undefined;
      const value = props.value as string;
      
      if (level === 1) {
        return <h1 className={className || "text-3xl font-bold"} style={style}>{value}</h1>;
      } else if (level === 2) {
        return <h2 className={className || "text-2xl font-bold"} style={style}>{value}</h2>;
      } else if (level === 3) {
        return <h3 className={className || "text-xl font-bold"} style={style}>{value}</h3>;
      } else {
        return <p className={className} style={style}>{value}</p>;
      }

    case "InputText":
      return (
        <InputText
          {...props}
          className={className}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.target.value })}
        />
      );

    case "Button":
      return (
        <Button
          {...props}
          className={className}
          style={style}
          onClick={(e) => handleEvent("onClick", e)}
        />
      );

    case "DataTable":
      return (
        <DataTable
          {...props}
          value={props.value || []}
          className={className}
          style={style}
        >
          {props.columns?.map((col: any, index: number) => (
            <Column key={index} field={col.field} header={col.header} />
          ))}
        </DataTable>
      );

    case "Card":
      return (
        <Card
          {...props}
          className={className}
          style={style}
        >
          {component.state?.data}
        </Card>
      );

    case "Toast":
      return <Toast ref={toastRef} className={className} style={style} />;

    default:
      // Для неподдерживаемых типов выводим заглушку
      return (
        <div className={className} style={style}>
          <p className="text-gray-500 text-sm">
            [Component: {componentType} - Not implemented]
          </p>
        </div>
      );
  }
}
