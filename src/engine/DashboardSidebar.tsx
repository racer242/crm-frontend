"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { NavItem, UserMenuConfig } from "@/types";
import { Menu } from "primereact/menu";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";
import { Avatar } from "primereact/avatar";

function buildMenuItems(
  items: NavItem[],
  pathname: string,
  onNavigate: (route: string) => void,
  collapsed: boolean,
) {
  return items.map((item) => {
    if ((item as any).separator) {
      return { separator: true };
    }
    const active = pathname === item.route;
    return {
      label: collapsed ? "" : item.label,
      icon: item.icon,
      command: () => onNavigate(item.route || "/"),
      style: active
        ? {
            background: "var(--highlight-bg)",
            color: "var(--highlight-text-color)",
          }
        : undefined,
    };
  });
}

function buildUserMenuItems(
  userMenu: UserMenuConfig | undefined,
  onNavigate: (route: string) => void,
) {
  return userMenu?.items.map((item) => {
    if ((item as any).separator) {
      return { separator: true };
    }
    return {
      label: item.label,
      icon: item.icon,
      command: () => onNavigate(item.route || "/"),
    };
  });
}

/**
 * UserMenuSection - shared between mobile and desktop sidebars
 */
interface UserMenuSectionProps {
  userMenu: UserMenuConfig;
  collapsed: boolean;
  onNavigate: (route: string) => void;
  wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
}

const UserMenuSection = React.memo(function UserMenuSection({
  userMenu,
  collapsed,
  onNavigate,
  wrapperProps,
}: UserMenuSectionProps) {
  const userMenuModel = useMemo(
    () => buildUserMenuItems(userMenu, onNavigate),
    [userMenu, onNavigate],
  );

  return (
    <div {...wrapperProps}>
      <div className="w-full p-link flex gap-3 align-items-center h-4rem text-color">
        <Avatar
          icon="pi pi-user"
          shape="circle"
          className="flex-none pointer-events-none"
        />
        {!collapsed && (
          <div className="flex flex-column align pointer-events-none">
            <span className="font-bold">{userMenu?.userName}</span>
            <span className="text-sm">{userMenu?.userRole}</span>
          </div>
        )}
      </div>
      <Menu
        model={userMenuModel}
        className="w-full border-none flex-shrink-0"
      />
    </div>
  );
});

interface DashboardSidebarProps {
  items: NavItem[];
  title: string;
  userMenu?: UserMenuConfig;
  isAuthenticated: boolean;
  mobileOpen: boolean;
  collapsed: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onCollapseChange: () => void;
}

export const DashboardSidebar = React.memo(function DashboardSidebar({
  items,
  title,
  userMenu,
  isAuthenticated,
  mobileOpen,
  collapsed,
  onMobileOpenChange,
  onCollapseChange,
}: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname() || "/";

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

  return (
    <>
      {/* Mobile Sidebar */}
      <Sidebar
        visible={mobileOpen}
        onHide={() => onMobileOpenChange(false)}
        position="left"
        className="w-16rem"
        blockScroll
      >
        <div className="flex flex-column h-full">
          <Menu
            model={buildMenuItems(items, pathname, handleNav, false)}
            className="border-none w-full flex-shrink-0"
          />
          <div className="flex-1"></div>
          {userMenu && (
            <UserMenuSection
              userMenu={userMenu}
              collapsed={false}
              onNavigate={handleNav}
            />
          )}
        </div>
      </Sidebar>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-column h-screen surface-overlay sticky z-4 top-0 transition-all transition-duration-300 ${
          collapsed ? "w-4rem" : "w-16rem"
        }`}
        style={{
          borderRight: "1px solid var(--surface-border)",
        }}
      >
        {/* Logo */}
        <div
          className="flex align-items-center h-4rem px-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--surface-border)" }}
        >
          {!collapsed && (
            <span className="font-semibold text-lg overflow-hidden text-ellipsis white-space-nowrap">
              {title}
            </span>
          )}
        </div>

        <div className={`flex-shrink-0 p-1`}>
          <Menu
            model={buildMenuItems(items, pathname, handleNav, collapsed)}
            className="border-none w-full"
          />
        </div>
        <div className="flex-1"></div>
        {/* User Section */}
        <div className="flex-shrink-0 p-1">
          {isAuthenticated && userMenu ? (
            <UserMenuSection
              userMenu={userMenu}
              collapsed={collapsed}
              onNavigate={handleNav}
              wrapperProps={{ className: "p-3" }}
            />
          ) : !isAuthenticated ? (
            <Button
              icon="pi pi-sign-in"
              label={!collapsed ? userMenu?.loginLabel : undefined}
              className={`p-button-text p-button-sm p-button-rounded w-full mb-1 ${
                collapsed ? "justify-content-center" : ""
              }`}
              onClick={handleAuthClick}
            />
          ) : null}
        </div>
        <div className="h-3rem"></div>

        {/* Collapse Button */}
        <div className="flex p-2">
          <Button
            icon={
              collapsed ? "pi pi-angle-double-right" : "pi pi-angle-double-left"
            }
            text
            onClick={onCollapseChange}
          />
        </div>
      </aside>

      {/* Mobile Spacer */}
      <div className="md:hidden h-4rem w-full flex-shrink-0" />
    </>
  );
});
