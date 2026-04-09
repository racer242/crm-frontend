"use client";

import React, { useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { NavItem, UserMenuConfig } from "@/types";
import { Menu } from "primereact/menu";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";
import type { Menu as MenuType } from "primereact/menu";

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
      className: "p-menuitem-list",
      style: active
        ? {
            background: "var(--primary-color)",
            color: "var(--primary-color-text)",
            borderRadius: "6px",
          }
        : undefined,
    };
  });
}

interface DashboardSidebarProps {
  items: NavItem[];
  title: string;
  userMenu?: UserMenuConfig;
  isAuthenticated: boolean;
}

export function DashboardSidebar({
  items,
  title,
  userMenu,
  isAuthenticated,
}: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const userMenuRef = useRef<MenuType>(null);

  const handleNav = useCallback(
    (route: string) => {
      setMobileOpen(false);
      router.push(route);
    },
    [router],
  );

  const handleAuthClick = useCallback(() => {
    router.push(isAuthenticated ? "/profile" : "/login");
  }, [isAuthenticated, router]);

  const handleLogout = useCallback(() => {
    router.push("/");
  }, [router]);

  const menuItems = buildMenuItems(items, pathname, handleNav);

  // Desktop user popup items
  const desktopUserItems: any[] =
    userMenu?.items.map((item) => ({
      label: item.label,
      icon: item.icon,
      command: () => handleNav(item.route),
    })) || [];

  if (isAuthenticated && userMenu) {
    desktopUserItems.push(
      { separator: true },
      {
        label: userMenu.logoutLabel,
        icon: "pi pi-sign-out",
        command: handleLogout,
      },
    );
  }

  return (
    <>
      {/* Mobile Header */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 h-4rem flex align-items-center justify-content-between px-3 z-5 surface-overlay"
        style={{ borderBottom: "1px solid var(--surface-border)" }}
      >
        <Button
          icon="pi pi-bars"
          className="p-button-rounded p-button-text p-button-secondary"
          onClick={() => setMobileOpen(true)}
          aria-label="Menu"
        />
        <span className="font-semibold text-lg">{title}</span>
        <Button
          icon={isAuthenticated ? "pi pi-user" : "pi pi-sign-in"}
          className="p-button-rounded p-button-text p-button-secondary"
          onClick={handleAuthClick}
          aria-label={isAuthenticated ? "Profile" : "Login"}
        />
      </header>

      {/* Mobile Sidebar */}
      <Sidebar
        visible={mobileOpen}
        onHide={() => setMobileOpen(false)}
        position="left"
        className="w-16rem"
        blockScroll
      >
        <div className="flex align-items-center justify-content-between mb-4">
          <h3 className="text-xl font-semibold m-0">{title}</h3>
          <Button
            icon="pi pi-times"
            className="p-button-rounded p-button-text p-button-sm"
            onClick={() => setMobileOpen(false)}
          />
        </div>
        <Menu model={menuItems} className="border-none w-full mb-4" />

        {userMenu && (
          <div
            className="border-top border-200 pt-3"
            style={{ borderTop: "1px solid var(--surface-border)" }}
          >
            {isAuthenticated
              ? userMenu.items.map((item) => (
                  <button
                    key={item.route}
                    className="flex align-items-center gap-3 w-full px-3 py-2 border-round-md cursor-pointer text-500 hover:surface-hover bg-transparent border-none"
                    onClick={() => handleNav(item.route)}
                  >
                    <i className={item.icon}></i>
                    <span>{item.label}</span>
                  </button>
                ))
              : null}
          </div>
        )}
      </Sidebar>

      {/* Desktop Sidebar */}
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
              {title}
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
          {userMenu && (
            <div className="relative mb-1">
              {isAuthenticated && (
                <Menu
                  model={desktopUserItems}
                  popup
                  ref={userMenuRef}
                  className="w-12rem"
                  appendTo="self"
                />
              )}
              <Button
                icon={isAuthenticated ? "pi pi-user" : "pi pi-sign-in"}
                label={
                  !collapsed
                    ? isAuthenticated
                      ? userMenu.profileLabel
                      : userMenu.loginLabel
                    : undefined
                }
                className={`p-button-text p-button-sm p-button-rounded w-full ${
                  collapsed ? "justify-content-center" : ""
                }`}
                onClick={(e) => {
                  if (isAuthenticated) userMenuRef.current?.toggle(e);
                  else handleAuthClick();
                }}
              />
            </div>
          )}
          <Button
            icon={
              collapsed ? "pi pi-angle-double-right" : "pi pi-angle-double-left"
            }
            className="p-button-text p-button-sm p-button-rounded w-full"
            onClick={() => setCollapsed(!collapsed)}
          />
        </div>
      </aside>

      {/* Mobile header spacer */}
      <div className="md:hidden h-4rem w-full flex-shrink-0" />
    </>
  );
}
