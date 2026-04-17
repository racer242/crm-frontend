"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { App, Page, NavItem } from "@/types";
import { PageRenderer } from "./PageRenderer";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { StateManager } from "@/core";
import { usePathname } from "next/navigation";
import { Toast } from "primereact/toast";

export function AppEngine({ config }: { config: App }) {
  const pathname = usePathname();

  const stateManagerRef = useRef<StateManager | null>(null);
  if (!stateManagerRef.current) {
    stateManagerRef.current = new StateManager(config);
  }
  const stateManager = stateManagerRef.current!;

  const resolvePage = useCallback(
    (currentPath: string | null): Page | null => {
      const route = currentPath || "/";
      return stateManager.getPageByRoute(route);
    },
    [stateManager],
  );

  const [currentPage, setCurrentPage] = useState<Page | null>(() =>
    resolvePage(pathname),
  );

  useEffect(() => {
    const page = resolvePage(pathname);
    if (page) {
      setCurrentPage(page);
    } else {
      console.warn(`Page not found for route: ${pathname}`);
      setCurrentPage(null);
    }
  }, [pathname, resolvePage]);

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const unsubscribe = stateManager.subscribe(() => {
      forceUpdate((n) => n + 1);
    });
    return unsubscribe;
  }, [stateManager]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const toastRef = useRef(null);

  if (!currentPage) {
    return (
      <div className="flex align-items-center justify-content-center min-h-screen">
        <p className="text-500">Page not found: {pathname}</p>
      </div>
    );
  }

  const navItems: NavItem[] = config.navbar?.items || [];
  const isAuthenticated = config.globalState?.auth?.isAuthenticated || false;
  const title = config.title || "CRM Platform";

  return (
    <div className="flex flex-column md:flex-row min-h-screen surface-900">
      <Toast ref={toastRef} />
      <DashboardHeader
        title={title}
        userMenu={config.userMenu}
        isAuthenticated={isAuthenticated}
        onMenuClick={() => setMobileMenuOpen(true)}
      />
      {navItems.length > 0 && (
        <DashboardSidebar
          items={navItems}
          title={title}
          userMenu={config.userMenu}
          isAuthenticated={isAuthenticated}
          mobileOpen={mobileMenuOpen}
          collapsed={collapsed}
          onMobileOpenChange={setMobileMenuOpen}
          onCollapseChange={() => setCollapsed(!collapsed)}
        />
      )}
      <main className="flex-1 overflow-auto pt-4rem md:pt-0">
        <div className="px-4 py-5 md:px-6 lg:px-8 max-w-screen-xl mx-auto">
          <PageRenderer
            key={currentPage.id}
            page={currentPage}
            appConfig={config}
            stateManager={stateManager}
          />
        </div>
      </main>
    </div>
  );
}
