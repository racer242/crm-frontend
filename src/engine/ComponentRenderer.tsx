"use client";

import React, { useEffect, useState } from "react";
import { Component } from "@/types";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Card } from "primereact/card";
import { Toast } from "primereact/toast";
import { Menubar } from "primereact/menubar";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRef } from "react";

export function ComponentRenderer({ component }: { component: Component }) {
  const { componentType, props = {}, className, style } = component;
  const toastRef = useRef<Toast>(null);
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleEvent = (eventType: string, eventValue: any) => {
    if (!component.events) return;

    const eventHandlers = component.events.filter((e) => e.event === eventType);
    eventHandlers.forEach((handler) => {
      handler.commands.forEach((cmd) => {
        console.log(`[Command] ${cmd.type}:`, cmd.params);
      });
    });
  };

  switch (componentType) {
    case "Text": {
      const level = props.level as number | undefined;
      const value = props.value as string;

      if (level === 1) {
        return (
          <h1
            className={`text-3xl font-bold text-100 ${className || ""}`}
            style={style}
          >
            {value}
          </h1>
        );
      } else if (level === 2) {
        return (
          <h2
            className={`text-2xl font-bold text-100 ${className || ""}`}
            style={style}
          >
            {value}
          </h2>
        );
      } else if (level === 3) {
        return (
          <h3
            className={`text-xl font-bold text-100 ${className || ""}`}
            style={style}
          >
            {value}
          </h3>
        );
      } else {
        return (
          <p className={`text-200 ${className || ""}`} style={style}>
            {value}
          </p>
        );
      }
    }

    case "InputText":
      return (
        <InputText
          {...props}
          className={`w-full ${className || ""}`}
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
        <Card {...props} className={className} style={style}>
          {component.state?.data}
        </Card>
      );

    case "Toast":
      return <Toast ref={toastRef} className={className} style={style} />;

    case "Menubar": {
      const menuModel = (props.model || []).map((item: any) => ({
        ...item,
        template: item.route ? (
          <Link
            href={item.route}
            className="p-menuitem-link flex align-items-center gap-2"
          >
            {item.icon && <i className={item.icon}></i>}
            <span className="p-menuitem-text">{item.label}</span>
          </Link>
        ) : undefined,
        command: item.route ? () => router.push(item.route) : undefined,
      }));

      if (!isMounted) {
        return <div className="h-3rem surface-800 border-round-md" />;
      }

      return <Menubar model={menuModel} className={className} style={style} />;
    }

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
