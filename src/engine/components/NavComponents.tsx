"use client";

import React from "react";
import { Menubar } from "primereact/menubar";
import { BreadCrumb } from "primereact/breadcrumb";
import { Steps } from "primereact/steps";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ComponentRendererProps } from "./types";
import { classNames } from "primereact/utils";

function processMenuItems(
  items: any[],
  router: any,
  handleEvent: (type: string, value: any) => void,
  addLink: boolean,
): any[] {
  return items.map((item: any) => {
    const processed: any = {
      ...item,
      template:
        addLink && item.route ? (
          <Link
            href={item.route}
            className="p-menuitem-link flex align-items-center gap-2"
          >
            {item.icon && <i className={item.icon}></i>}
            <span className="p-menuitem-text">{item.label}</span>
          </Link>
        ) : undefined,
      command: item.commands
        ? () =>
            handleEvent("onNavigate", {
              type: "onNavigate",
              commands: item.commands,
            })
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
        addLink,
      );
    }

    return processed;
  });
}

export function renderMenubar({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const router = useRouter();

  const { activeItemId, activeSubitemId, ...restProps } = props as any;

  let menuModel = processMenuItems(
    restProps.model || [],
    router,
    handleEvent,
    true,
  );

  if (activeItemId) {
    menuModel = menuModel.map((item) =>
      item.id === activeItemId
        ? { ...item, className: classNames(item.className, "p-focus") }
        : item,
    );
  }

  if (activeItemId && activeSubitemId) {
    menuModel = menuModel.map((parent) => {
      if (parent.id === activeItemId && parent.items) {
        const sub = parent.items.find(
          (child: any) => child.id === activeSubitemId,
        );
        if (sub) {
          return { ...parent, label: sub.label, icon: sub.icon };
        }
      }
      return parent;
    });
  }

  return (
    <Menubar
      {...restProps}
      model={menuModel}
      className={`w-full ${className || ""} ${restProps.allowMobile === true ? "" : "custom-menubar-fixed"}`}
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

  const { model, ...restProps } = props;

  const breadcrumbModel = processMenuItems(
    model || [],
    router,
    handleEvent,
    true,
  );

  return (
    <BreadCrumb
      {...restProps}
      model={breadcrumbModel}
      className={className}
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
    false,
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
