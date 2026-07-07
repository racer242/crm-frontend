"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { NavItem, UserMenuConfig } from "@/types";
import { useAuth } from "@/auth/AuthContext";
import { Menu } from "primereact/menu";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";
import { Avatar } from "primereact/avatar";
import { classNames } from "primereact/utils";

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
    const active =
      item.route === "/"
        ? pathname === "/"
        : pathname === item.route || pathname.startsWith(item.route + "/");
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
  onLogout: () => void,
) {
  return userMenu?.items.map((item) => {
    if ((item as any).separator) {
      return { separator: true };
    }
    return {
      label: item.label,
      icon: item.icon,
      command: () => {
        if (item.action === "logout") {
          onLogout();
        } else {
          onNavigate(item.route || "/");
        }
      },
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
  onLogout: () => void;
  user: { name: string; role: string } | null;
  wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
  collapsible?: boolean;
}

const UserMenuSection = React.memo(function UserMenuSection({
  userMenu,
  collapsed,
  onNavigate,
  onLogout,
  user,
  wrapperProps,
  collapsible,
}: UserMenuSectionProps) {
  const [expanded, setExpanded] = useState(!collapsible);
  const userMenuModel = useMemo(
    () => buildUserMenuItems(userMenu, onNavigate, onLogout),
    [userMenu, onNavigate, onLogout],
  );

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <div {...wrapperProps}>
      <div
        className="w-full p-link flex gap-3 align-items-center h-4rem text-color cursor-pointer"
        onClick={collapsible ? handleToggle : undefined}
      >
        <Avatar
          icon="pi pi-user"
          shape="circle"
          className="flex-none pointer-events-none"
        />
        {!collapsed && (
          <div className="flex flex-column align-items-start pointer-events-none">
            <span className="font-bold">
              {user?.name ?? userMenu?.userName}
            </span>
            <span className="text-sm">{user?.role ?? userMenu?.userRole}</span>
          </div>
        )}
        {collapsible && !collapsed && (
          <i
            className={classNames(
              "pi pointer-events-none ml-auto",
              expanded ? "pi-angle-up" : "pi-angle-down",
            )}
          />
        )}
      </div>
      {expanded && (
        <Menu
          model={userMenuModel}
          className="w-full border-none flex-shrink-0"
        />
      )}
    </div>
  );
});

/**
 * CampMenuSection - displays current campaign and allows switching
 */
interface CampMenuSectionProps {
  camps: { id: number; name: string; current: boolean }[];
  currentCampId: number;
  currentCampName: string;
  collapsed: boolean;
}

const CampMenuSection = React.memo(function CampMenuSection({
  camps,
  currentCampId,
  currentCampName,
  collapsed,
}: CampMenuSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleCampChange = useCallback((campId: number) => {
    // Set cookie and reload
    document.cookie = `camp_id=${campId}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  }, []);

  if (!camps || camps.length === 0) return null;

  const otherCamps = camps.filter((c) => !c.current);

  return (
    <div
      className="flex-shrink-0 p-1"
      style={{ borderTop: "1px solid var(--surface-border)" }}
    >
      <div
        className="w-full p-link flex gap-3 align-items-center h-3rem text-color cursor-pointer px-3"
        onClick={handleToggle}
      >
        <i className="pi pi-flag flex-none pointer-events-none" />
        {!collapsed && (
          <div className="flex flex-column align-items-start pointer-events-none flex-1 min-w-0">
            <span className="text-sm font-medium overflow-hidden text-ellipsis white-space-nowrap">
              {currentCampName}
            </span>
          </div>
        )}
        {!collapsed && otherCamps.length > 0 && (
          <i
            className={classNames(
              "pi pointer-events-none",
              expanded ? "pi-angle-up" : "pi-angle-down",
            )}
          />
        )}
      </div>
      {expanded && !collapsed && otherCamps.length > 0 && (
        <div className="flex flex-column">
          {otherCamps.map((camp) => (
            <div
              key={camp.id}
              className="p-link flex align-items-center gap-3 px-3 py-2 text-color cursor-pointer hover:surface-hover border-round"
              onClick={() => handleCampChange(camp.id)}
            >
              <i className="pi pi-flag flex-none" style={{ opacity: 0.5 }} />
              <span className="text-sm">{camp.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

interface DashboardSidebarProps {
  items: NavItem[];
  title: string;
  userMenu?: UserMenuConfig;
  mobileOpen: boolean;
  collapsed: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onCollapseChange: () => void;
  camps?: { id: number; name: string; current: boolean }[];
  currentCampId?: number;
  currentCampName?: string;
}

export const DashboardSidebar = React.memo(function DashboardSidebar({
  items,
  title,
  userMenu,
  mobileOpen,
  collapsed,
  onMobileOpenChange,
  onCollapseChange,
  camps,
  currentCampId,
  currentCampName,
}: DashboardSidebarProps) {
  const { isAuthenticated, user, logout } = useAuth();
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

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

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
          {camps && camps.length > 0 && (
            <CampMenuSection
              camps={camps}
              currentCampId={currentCampId || 0}
              currentCampName={currentCampName || ""}
              collapsed={false}
            />
          )}
          {userMenu && (
            <UserMenuSection
              userMenu={userMenu}
              collapsed={false}
              onNavigate={handleNav}
              onLogout={handleLogout}
              user={user}
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
        {/* Campaign Section */}
        {camps && camps.length > 0 && (
          <CampMenuSection
            camps={camps}
            currentCampId={currentCampId || 0}
            currentCampName={currentCampName || ""}
            collapsed={collapsed}
          />
        )}
        {/* User Section */}
        <div className="flex-shrink-0 p-1">
          {isAuthenticated && userMenu ? (
            <UserMenuSection
              userMenu={userMenu}
              collapsed={collapsed}
              onNavigate={handleNav}
              onLogout={handleLogout}
              user={user}
              wrapperProps={{ className: "p-3" }}
              collapsible
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
