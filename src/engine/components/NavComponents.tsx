"use client";

import React from "react";
import { Menubar } from "primereact/menubar";
import { BreadCrumb } from "primereact/breadcrumb";
import { Steps } from "primereact/steps";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ComponentRendererProps } from "./types";

export function renderMenubar({
  props,
  className,
  style,
  isMounted,
  handleEvent,
}: ComponentRendererProps) {
  const router = useRouter();

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
    command: item.command
      ? () => handleEvent("onClick", { type: "menu", item })
      : item.route
        ? () => router.push(item.route)
        : undefined,
  }));

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

  const breadcrumbModel = (props.model || []).map((item: any) => ({
    ...item,
    command: item.command
      ? () => handleEvent("onClick", { type: "breadcrumb", item })
      : item.route
        ? () => router.push(item.route)
        : undefined,
  }));

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

  const stepsModel = (props.model || []).map((item: any) => ({
    label: item.label,
    icon: item.icon,
    command: item.command
      ? () => handleEvent("onClick", { type: "steps", item })
      : item.route
        ? () => router.push(item.route)
        : undefined,
  }));

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
