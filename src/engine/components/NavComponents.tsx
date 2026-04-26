"use client";

import React from "react";
import { Menubar } from "primereact/menubar";
import { BreadCrumb } from "primereact/breadcrumb";
import { Steps } from "primereact/steps";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ComponentRendererProps } from "./types";

function processMenuItems(
  items: any[],
  router: any,
  handleEvent: (type: string, value: any) => void,
  eventType: string,
): any[] {
  return items.map((item: any) => {
    const processed: any = {
      ...item,
      template:
        eventType === "menu" && item.route ? (
          <Link
            href={item.route}
            className="p-menuitem-link flex align-items-center gap-2"
          >
            {item.icon && <i className={item.icon}></i>}
            <span className="p-menuitem-text">{item.label}</span>
          </Link>
        ) : undefined,
      command: item.command
        ? () => handleEvent("onClick", { type: eventType, item })
        : item.route
          ? () => router.push(item.route)
          : undefined,
    };

    // Recursively process submenu items
    if (item.items && Array.isArray(item.items)) {
      processed.items = processMenuItems(
        item.items,
        router,
        handleEvent,
        eventType,
      );
    }

    return processed;
  });
}

export function renderMenubar({
  props,
  className,
  style,
  isMounted,
  handleEvent,
}: ComponentRendererProps) {
  const router = useRouter();

  const menuModel = processMenuItems(
    props.model || [],
    router,
    handleEvent,
    "menu",
  );

  if (!isMounted) return <div className="h-3rem surface-800 border-round-md" />;

  return (
    <Menubar
      model={menuModel}
      className={`w-full mb-4 ${className || ""}`}
      style={style}
    />
  );
}

export function renderBreadcrumb({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const router = useRouter();

  const breadcrumbModel = processMenuItems(
    props.model || [],
    router,
    handleEvent,
    "breadcrumb",
  );

  return (
    <BreadCrumb
      model={breadcrumbModel}
      className={`mb-4 ${className || ""}`}
      style={style}
    />
  );
}

export function renderSteps({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const router = useRouter();

  const stepsModel = processMenuItems(
    props.model || [],
    router,
    handleEvent,
    "steps",
  );

  return (
    <Steps
      model={stepsModel}
      className={className || ""}
      style={style}
      activeIndex={props.activeIndex || 0}
      readOnly={props.readOnly !== false}
    />
  );
}
