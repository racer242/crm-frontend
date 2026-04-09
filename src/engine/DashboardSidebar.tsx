"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { NavItem } from "@/types";
import { Sidebar } from "primereact/sidebar";
import { Menu } from "primereact/menu";
import { Button } from "primereact/button";

/** Рендерит пункт меню с подсветкой активного */
function NavMenuItem({ item, active }: { item: NavItem; active: boolean }) {
  const { label, icon, route } = item;
  return (
    <div
      className={`flex align-items-center gap-3 px-3 py-2 border-round-md cursor-pointer transition-all ${
        active ? "font-medium" : "text-500 hover:surface-hover"
      }`}
      style={
        active
          ? {
              background: "var(--primary-color)",
              color: "var(--primary-color-text)",
            }
          : undefined
      }
    >
      <i className={icon}></i>
      <span className="overflow-hidden text-ellipsis white-space-nowrap">
        {label}
      </span>
    </div>
  );
}

export function DashboardSidebar({ items }: { items: NavItem[] }) {
  const router = useRouter();
  const pathname = usePathname() || "/";

  const [collapsed, setCollapsed] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileVisible(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isActive = useCallback(
    (route: string) => pathname === route,
    [pathname],
  );

  const handleNav = useCallback(
    (route: string) => {
      setMobileVisible(false);
      router.push(route);
    },
    [router],
  );

  // Build menu items with custom template per item
  const menuItems = items.map((item) => ({
    label: item.label,
    icon: item.icon,
    command: () => handleNav(item.route),
    template: (
      <div onClick={() => handleNav(item.route)}>
        <NavMenuItem item={item} active={isActive(item.route)} />
      </div>
    ),
  }));

  return (
    <>
      {/* Mobile hamburger */}
      <div className="md:hidden fixed top-3 left-3 z-5">
        <Button
          icon="pi pi-bars"
          className="p-button-rounded p-button-text p-button-secondary"
          onClick={() => setMobileVisible(true)}
          aria-label="Open menu"
        />
      </div>

      {/* Mobile sidebar using PrimeReact Sidebar + Menu */}
      <Sidebar
        visible={mobileVisible}
        onHide={() => setMobileVisible(false)}
        position="left"
        baseZIndex={1000}
        showCloseIcon={false}
        className="w-18rem"
      >
        <div className="flex align-items-center justify-content-between mb-3">
          <h3 className="text-xl font-semibold m-0">Menu</h3>
          <Button
            icon="pi pi-times"
            className="p-button-rounded p-button-text p-button-sm"
            onClick={() => setMobileVisible(false)}
          />
        </div>
        <Menu
          model={menuItems}
          className="border-none w-full"
          style={{ background: "transparent" }}
        />
      </Sidebar>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-column h-screen surface-overlay transition-all transition-duration-300 sticky top-0 ${
          collapsed ? "w-4rem" : "w-15rem"
        }`}
        style={{ borderRight: "1px solid var(--surface-border)" }}
      >
        {/* Logo */}
        <div
          className="flex align-items-center h-4rem px-3"
          style={{ borderBottom: "1px solid var(--surface-border)" }}
        >
          {!collapsed && (
            <span className="text-lg font-semibold overflow-hidden text-ellipsis white-space-nowrap">
              CRM
            </span>
          )}
        </div>

        {/* Navigation using PrimeReact Menu */}
        <div className="flex-1 py-2 overflow-y-auto overflow-x-hidden px-2">
          <Menu
            model={menuItems}
            className="border-none w-full"
            style={{ background: "transparent" }}
          />
        </div>

        {/* Collapse button */}
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
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          />
        </div>
      </aside>
    </>
  );
}
