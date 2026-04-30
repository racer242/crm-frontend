"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { App, Page, NavItem, DataFeedResult, Command } from "@/types";
import { PageRenderer } from "./PageRenderer";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { StateManager, ElementIndex } from "@/core";
import { usePathname, useRouter } from "next/navigation";
import { Toast } from "primereact/toast";
import { useDataFeedErrors } from "./hooks/useDataFeedErrors";
import { PathResolver } from "@/core/PathResolver";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { ComponentProvider } from "./ComponentContext";

export function AppEngine({
  config,
  dataFeedErrors: initialErrors,
  initialDataFeed,
  initialPageId,
}: {
  config: App;
  dataFeedErrors?: string[];
  initialDataFeed?: DataFeedResult[];
  initialPageId?: string | null;
}) {
  const pathname = usePathname();
  const elementIndexRef = useRef<ElementIndex | null>(null);
  if (!elementIndexRef.current) {
    elementIndexRef.current = new ElementIndex(config);
  }

  const stateManagerRef = useRef<StateManager | null>(null);
  const prevPageIdRef = useRef<string | null>(null);
  if (!stateManagerRef.current) {
    stateManagerRef.current = new StateManager(
      config,
      elementIndexRef.current,
      initialDataFeed,
      initialPageId || undefined,
    );
  }
  const stateManager = stateManagerRef.current!;
  const elementIndex = elementIndexRef.current!;

  // On client-side navigation, re-apply initialDataFeed for the new page
  useEffect(() => {
    // Resolve page to get its ID
    const route = pathname || "/";
    const page = stateManager.getPageByRoute(route);
    const newPageId = page?.id || null;

    // If page changed and we have new dataFeed results, apply them
    if (
      prevPageIdRef.current !== newPageId &&
      initialDataFeed &&
      initialDataFeed.length > 0
    ) {
      for (const result of initialDataFeed) {
        if (result.success && result.target) {
          const { elementId, statePath } = PathResolver.parseTarget(
            result.target,
          );
          const targetId = elementId || newPageId;
          if (!targetId) continue;

          if (statePath) {
            stateManager.setStateField(targetId, statePath, result.data);
          } else {
            // No path: merge data into existing state
            if (typeof result.data === "object") {
              stateManager.mergeState(targetId, result.data);
            }
          }
        }
      }
    }
    prevPageIdRef.current = newPageId;
  }, [pathname, initialDataFeed, stateManager]);

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

  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const toastRef = useRef<Toast>(null);

  // Page transition: use CSS visibility + transition to hide FOUC
  // Container starts invisible, then becomes visible after content renders
  const [pageKey, setPageKey] = useState<string>(currentPage?.id ?? "");
  const [isVisible, setIsVisible] = useState(true);
  const prevPageIdRef2 = useRef<string | null>(null);

  // Detect page change synchronously
  if (currentPage && prevPageIdRef2.current !== currentPage.id) {
    prevPageIdRef2.current = currentPage.id;
    setPageKey(currentPage.id);
    setIsVisible(false);
  }

  // After the new page is rendered, make it visible
  useEffect(() => {
    if (!isVisible) {
      // Wait for content to be painted, then fade in
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Show server-side data feed errors on mount
  useEffect(() => {
    if (initialErrors && initialErrors.length > 0 && toastRef.current) {
      initialErrors.forEach((error) => {
        toastRef.current?.show({
          severity: "error",
          summary: "Data Feed Error",
          detail: error,
          life: 5000,
        });
      });
    }
  }, [initialErrors]);

  // Track client-side data feed errors from page state
  const [dataFeedErrors, setDataFeedErrors] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = stateManager.subscribe(
      (elementPath, changedPath, oldState, newState) => {
        // Check if dataFeedErrors changed in page state
        if (currentPage && elementPath === currentPage.id) {
          const newErrors = newState?.dataFeedErrors || [];
          setDataFeedErrors(newErrors);
        }
      },
    );
    return unsubscribe;
  }, [stateManager, currentPage]);

  // Use the hook to display client-side errors
  useDataFeedErrors(toastRef, dataFeedErrors);

  // Callbacks for command execution
  const showToast = useCallback(
    (message: string, severity?: "success" | "info" | "warn" | "error") => {
      toastRef.current?.show({
        severity: severity || "info",
        summary:
          severity === "error"
            ? "Error"
            : severity === "success"
              ? "Success"
              : "Info",
        detail: message,
        life: 5000,
      });
    },
    [],
  );

  const navigate = useCallback(
    (url: string) => {
      router.push(url);
    },
    [router],
  );

  const onCollapseChange = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmDialog({
        message,
        header: "Confirmation",
        icon: "pi pi-exclamation-triangle",
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }, []);

  if (!currentPage) {
    return (
      <div className="flex align-items-center justify-content-center min-h-screen">
        <p className="text-500">Page not found: {pathname}</p>
      </div>
    );
  }

  const navItems: NavItem[] = config.navbar?.items || [];
  const isAuthenticated = true; // TODO: Replace with proper auth mechanism
  const title = config.title || "CRM Platform";

  return (
    <div className="flex flex-column md:flex-row min-h-screen surface-900">
      <Toast ref={toastRef} />
      <ConfirmDialog />
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
          onCollapseChange={onCollapseChange}
        />
      )}
      <main className="flex-1 overflow-auto pt-4rem md:pt-0">
        <div
          className="px-4 py-5 md:px-6 lg:px-8 max-w-screen-xl mx-auto"
          style={{
            visibility: isVisible ? "visible" : "hidden",
            transition: "visibility 0s linear 50ms, opacity 150ms ease-in",
            opacity: isVisible ? 1 : 0,
          }}
        >
          <ComponentProvider
            pageId={currentPage.id}
            appConfig={config}
            stateManager={stateManager}
            elementIndex={elementIndex}
            showToast={showToast}
            navigate={navigate}
            confirm={confirm}
          >
            <PageRenderer key={pageKey} page={currentPage} />
          </ComponentProvider>
        </div>
      </main>
    </div>
  );
}
