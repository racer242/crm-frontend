"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { NavItem, UserMenuConfig } from "@/types";
import { Menu } from "primereact/menu";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";
import { SplitButton } from "primereact/splitbutton";

function buildMenuItems(
  items: NavItem[],
  pathname: string,
  onNavigate: (route: string) => void,
) {
  return items.map((item) => {
    if ((item as any).separator) {
      return { separator: true };
    }
    const active = pathname === item.route;
    return {
      label: item.label,
      icon: item.icon,
      command: () => onNavigate(item.route || "/"),
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

interface DashboardSidebarProps {
  items: NavItem[];
  title: string;
  userMenu?: UserMenuConfig;
  isAuthenticated: boolean;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export function DashboardSidebar({
  items,
  title,
  userMenu,
  isAuthenticated,
  mobileOpen,
  onMobileOpenChange,
}: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [collapsed, setCollapsed] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleNav = useCallback(
    (route: string) => {
      onMobileOpenChange(false);
      router.push(route);
    },
    [router, onMobileOpenChange],
  );

  const handleAuthClick = useCallback(() => {
    router.push(isAuthenticated ? "/profile" : "/login");
  }, [isAuthenticated, router]);

  const menuItems = buildMenuItems(items, pathname, handleNav);

  // Build user menu items (shared between desktop and mobile)
  const userMenuItems: any[] = userMenu
    ? (isAuthenticated
        ? userMenu.items
        : [
            {
              label: userMenu.loginLabel,
              icon: "pi pi-sign-in",
              route: "/login",
            },
          ]
      ).map((item) => {
        if (item.separator) {
          return { separator: true };
        }
        return {
          label: item.label,
          icon: item.icon,
          command: () => handleNav(item.route || "/"),
        };
      })
    : [];

  return (
    <>
      {/* Mobile Sidebar */}
      <Sidebar
        visible={mobileOpen}
        onHide={() => onMobileOpenChange(false)}
        position="left"
        className="w-16rem"
        blockScroll
        showCloseIcon={true}
      >
        <div className="flex flex-column h-full">
          <Menu
            model={menuItems}
            className="border-none w-full flex-shrink-0"
          />
          <div className="flex-1"></div>
          {userMenu && (
            <Menu
              model={userMenuItems}
              className="w-full border-none pt-3 flex-shrink-0"
            />
          )}
        </div>
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

        <div className="p-2">
          {userMenu &&
            (mounted && isAuthenticated ? (
              <SplitButton
                label={!collapsed ? userMenu.profileLabel : undefined}
                icon="pi pi-user"
                model={userMenuItems}
                className={`p-button-text p-button-sm p-button-rounded w-full mb-1 ${
                  collapsed ? "justify-content-center" : ""
                }`}
                menuStyle={{ width: "12rem" }}
                dropdownIcon="pi pi-angle-right"
                onClick={() => handleNav("/profile")}
              />
            ) : (
              <Button
                icon="pi pi-sign-in"
                label={!collapsed ? userMenu.loginLabel : undefined}
                className={`p-button-text p-button-sm p-button-rounded w-full mb-1 ${
                  collapsed ? "justify-content-center" : ""
                }`}
                onClick={handleAuthClick}
              />
            ))}
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
