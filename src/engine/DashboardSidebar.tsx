"use client";

import React, { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { NavItem } from "@/types";
import { Menu } from "primereact/menu";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";

function buildMenuItems(
  items: NavItem[],
  pathname: string,
  onNavigate: (route: string) => void,
) {
  return items.map((item) => {
    const active = pathname === item.route;
    return {
      label: item.label,
      icon: item.icon,
      command: () => onNavigate(item.route),
      className: "border-round-lg overflow-hidden",
      style: active
        ? {
            background: "var(--highlight-bg)",
            color: "var(--highlight-text-color)",
          }
        : undefined,
    };
  });
}

export function DashboardSidebar({ items }: { items: NavItem[] }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = useCallback(
    (route: string) => {
      setMobileOpen(false);
      router.push(route);
    },
    [router],
  );

  const menuItems = buildMenuItems(items, pathname, handleNav);

  return (
    <>
      {/* Mobile hamburger */}
      <Button
        icon="pi pi-bars"
        className="p-button-rounded p-button-text p-button-secondary md:hidden fixed top-3 left-3 z-5"
        onClick={() => setMobileOpen(true)}
        aria-label="Menu"
      />

      {/* Mobile sidebar */}
      <Sidebar
        visible={mobileOpen}
        onHide={() => setMobileOpen(false)}
        position="left"
        className="w-16rem"
      >
        <Menu model={menuItems} className="border-none w-full" />
      </Sidebar>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-column h-screen surface-overlay sticky top-0 transition-all transition-duration-300 ${
          collapsed ? "w-4rem" : "w-14rem"
        }`}
        style={{ borderRight: "1px solid var(--surface-border)" }}
      >
        <div
          className="flex align-items-center h-4rem px-3"
          style={{ borderBottom: "1px solid var(--surface-border)" }}
        >
          {!collapsed && (
            <span className="font-semibold text-lg overflow-hidden text-ellipsis white-space-nowrap">
              CRM
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <Menu
            model={menuItems}
            className="border-none w-full"
            style={{ background: "transparent" }}
          />
        </div>

        <div
          className="p-2"
          style={{ borderTop: "1px solid var(--surface-border)" }}
        >
          <Button
            icon={
              collapsed ? "pi pi-angle-double-right" : "pi pi-angle-double-left"
            }
            className="p-button-text p-button-sm p-button-rounded w-full"
            onClick={() => setCollapsed(!collapsed)}
          />
        </div>
      </aside>
    </>
  );
}
