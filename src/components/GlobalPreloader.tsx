"use client";

import React, { useEffect, useState } from "react";

/**
 * GlobalPreloader
 * Отображает экран загрузки до тех пор, пока браузер не загрузит все ресурсы
 * (шрифты, стили, изображения) при первой загрузке страницы.
 * Скрывается только при событии window 'load' (F5 или прямой заход).
 * При клиентской навигации (SPA) не появляется.
 */
export function GlobalPreloader() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Используем событие 'load', которое срабатывает после полной загрузки всех ресурсов.
    // Это предотвращает мигание и FOUC только при старте сессии.
    const handleLoad = () => {
      // Небольшая задержка для плавности, чтобы браузер успел отрисовать фрейм
      requestAnimationFrame(() => {
        setIsVisible(false);
      });
    };

    // Если документ уже загружен (например, при быстрой навигации), сразу скрываем
    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
    }

    return () => {
      window.removeEventListener("load", handleLoad);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--surface-ground)] transition-opacity duration-500 ease-in-out"
      style={{
        opacity: 1,
      }}
    >
      {/* Здесь можно разместить спиннер или логотип */}
      <div className="flex flex-column align-items-center gap-3">
        <i className="pi pi-spin pi-spinner text-4xl text-primary"></i>
        <span className="text-lg font-medium text-500">Загрузка CRM...</span>
      </div>
    </div>
  );
}
