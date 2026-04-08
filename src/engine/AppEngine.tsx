"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { App, Page } from "@/types";
import { PageRenderer } from "./PageRenderer";
import { StateManager } from "@/core";
import { usePathname } from "next/navigation";

/**
 * AppEngine - главный компонент приложения
 * Загружает конфигурацию и управляет рендерингом страниц
 */
export function AppEngine({ config }: { config: App }) {
  const pathname = usePathname();

  // Создаём StateManager сразу через lazy initializer
  const stateManagerRef = useRef<StateManager | null>(null);
  if (!stateManagerRef.current) {
    stateManagerRef.current = new StateManager(config);
  }
  const stateManager = stateManagerRef.current!;

  // Определяем текущую страницу
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

  // Обновляем страницу при изменении pathname (включая back/forward)
  useEffect(() => {
    const page = resolvePage(pathname);

    if (page) {
      setCurrentPage(page);
    } else {
      console.warn(`Page not found for route: ${pathname}`);
      setCurrentPage(null);
    }
  }, [pathname, resolvePage]);

  // Подписка на изменения состояния для ре-рендера
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const unsubscribe = stateManager.subscribe(() => {
      forceUpdate((n) => n + 1);
    });
    return unsubscribe;
  }, [stateManager]);

  // 404 - страница не найдена
  if (!currentPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Page not found: {pathname}</p>
      </div>
    );
  }

  return <PageRenderer key={currentPage.id} page={currentPage} />;
}
