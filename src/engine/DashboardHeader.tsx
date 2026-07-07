"use client";

import React, { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { UserMenuConfig } from "@/types";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "primereact/button";
import { Avatar } from "primereact/avatar";

interface DashboardHeaderProps {
  title: string;
  userMenu?: UserMenuConfig;
  onMenuClick: () => void;
  currentCampName?: string;
}

export function DashboardHeader({
  title,
  userMenu,
  onMenuClick,
  currentCampName,
}: DashboardHeaderProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const t = useTranslations("app");

  const handleAuthClick = useCallback(() => {
    router.push(isAuthenticated ? "/profile" : "/login");
  }, [isAuthenticated, router]);

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-4rem flex align-items-center justify-content-between px-3 surface-ground z-5">
      <Button
        icon="pi pi-bars"
        className="p-button-rounded p-button-text p-button-secondary"
        onClick={onMenuClick}
        aria-label={t("menu")}
      />
      <div className="flex align-items-center gap-2">
        <span className="font-semibold text-lg">{title}</span>
        {currentCampName && (
          <span className="text-sm text-500 hidden sm:inline">
            | {currentCampName}
          </span>
        )}
      </div>
      <Button
        icon={
          isAuthenticated ? (
            <Avatar
              icon="pi pi-user"
              shape="circle"
              className="flex-none pointer-events-none"
            />
          ) : (
            "pi pi-sign-in"
          )
        }
        className="p-button-rounded p-button-text p-button-secondary"
        onClick={handleAuthClick}
        aria-label={isAuthenticated ? t("profile") : t("login")}
      />
    </header>
  );
}
