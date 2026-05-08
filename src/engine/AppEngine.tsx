"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { App, Page, NavItem, DataFeedResult, Command } from "@/types";
import { PageRenderer } from "./PageRenderer";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { StateManager, ElementIndex } from "@/core";
import { PageIndex } from "@/core/config";
import { usePathname, useRouter } from "next/navigation";
import { Toast } from "primereact/toast";
import { useDataFeedErrors } from "./hooks/useDataFeedErrors";
import { PathResolver } from "@/core/PathResolver";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { ComponentProvider } from "./ComponentContext";
import { FileUpload } from "primereact/fileupload";

export function AppEngine({
  config,
  elementIndex,
  dataFeedErrors: initialErrors,
  initialDataFeed,
  initialPageId,
  route: initialRoute,
}: {
  config: App;
  elementIndex: PageIndex;
  dataFeedErrors?: string[];
  initialDataFeed?: DataFeedResult[];
  initialPageId?: string | null;
  route?: string;
}) {
  const pathname = usePathname();

  // Create ElementIndex from per-page plain object (no rebuild needed)
  const elementIndexRef = useRef<ElementIndex | null>(null);
  if (!elementIndexRef.current) {
    elementIndexRef.current = new ElementIndex(elementIndex);
  }
  const resolvedIndex = elementIndexRef.current!;

  const stateManagerRef = useRef<StateManager | null>(null);
  const prevPageIdRef = useRef<string | null>(null);
  if (!stateManagerRef.current) {
    stateManagerRef.current = new StateManager(
      config,
      resolvedIndex,
      initialDataFeed,
      initialPageId || undefined,
    );
  }
  const stateManager = stateManagerRef.current!;

  // Resolve route with fallback matching for client-side navigation
  const resolveRouteWithFallback = useCallback(
    (path: string): string => {
      const slug = path.split("/").filter(Boolean);
      for (let i = slug.length; i >= 0; i--) {
        const testRoute = i > 0 ? "/" + slug.slice(0, i).join("/") : "/";
        if (stateManager.getPageByRoute(testRoute)) return testRoute;
      }
      return "/";
    },
    [stateManager],
  );

  // Use initialRoute from server (with fallback matching already applied)
  // or resolve on client-side with fallback
  const route = initialRoute || resolveRouteWithFallback(pathname);

  // On client-side navigation, re-apply initialDataFeed for the new page
  useEffect(() => {
    // Resolve page to get its ID (with fallback matching)
    const resolvedRoute = resolveRouteWithFallback(pathname);
    const page = stateManager.getPageByRoute(resolvedRoute);
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
  }, [pathname, initialDataFeed, stateManager, resolveRouteWithFallback]);

  const [currentPage, setCurrentPage] = useState<Page | null>(() => {
    return stateManager.getPageByRoute(route);
  });

  useEffect(() => {
    const page = stateManager.getPageByRoute(route);
    if (page) {
      setCurrentPage(page);
    } else {
      console.warn(`Page not found for route: ${route}`);
      setCurrentPage(null);
    }
  }, [route, stateManager]);

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

  const refresh = useCallback(
    (mode: string) => {
      switch (mode) {
        case "replace":
          router.replace(window.location.pathname + window.location.search);
          break;
        case "reload":
          window.location.reload();
          break;
        default: // "refresh"
          router.refresh();
      }
    },
    [router],
  );

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
        <div className="px-4 py-5 md:px-6 lg:px-8 max-w-screen-xl mx-auto">
          <ComponentProvider
            pageId={currentPage.id}
            appConfig={config}
            stateManager={stateManager}
            elementIndex={resolvedIndex}
            showToast={showToast}
            navigate={navigate}
            confirm={confirm}
            refresh={refresh}
          >
            <PageRenderer page={currentPage} />
            {/* Убирает FOUC при переходе между страницами */}
            <FileUpload
              mode="basic"
              disabled={true}
              style={{ display: "none" }}
            />
          </ComponentProvider>
        </div>
      </main>
    </div>
  );
}
