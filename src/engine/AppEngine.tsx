"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { App, Page, NavItem } from "@/types";
import { PageRenderer } from "./PageRenderer";
import { DashboardSidebar } from "./DashboardSidebar";
import { StateManager } from "@/core";
import { usePathname } from "next/navigation";

/**
 * AppEngine - главный компонент приложения
 */
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

  if (!currentPage) {
    return (
      <div className="flex align-items-center justify-content-center min-h-screen">
        <p className="text-500">Page not found: {pathname}</p>
      </div>
    );
  }

  const navItems: NavItem[] = config.navbar?.items || [];

  return (
    <div className="flex min-h-screen surface-900">
      {navItems.length > 0 && <DashboardSidebar items={navItems} />}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8 max-w-12">
          <PageRenderer key={currentPage.id} page={currentPage} />
        </div>
      </main>
    </div>
  );
}
