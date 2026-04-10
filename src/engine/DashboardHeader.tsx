"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserMenuConfig } from "@/types";
import { Button } from "primereact/button";
import { Avatar } from "primereact/avatar";

interface DashboardHeaderProps {
  title: string;
  userMenu?: UserMenuConfig;
  isAuthenticated: boolean;
  onMenuClick: () => void;
}

export function DashboardHeader({
  title,
  userMenu,
  isAuthenticated,
  onMenuClick,
}: DashboardHeaderProps) {
  const router = useRouter();

  const handleAuthClick = useCallback(() => {
    router.push(isAuthenticated ? "/profile" : "/login");
  }, [isAuthenticated, router]);

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-4rem flex align-items-center justify-content-between px-3 surface-ground z-5">
      <Button
        icon="pi pi-bars"
        className="p-button-rounded p-button-text p-button-secondary"
        onClick={onMenuClick}
        aria-label="Menu"
      />
      <span className="font-semibold text-lg">{title}</span>
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
        aria-label={isAuthenticated ? "Profile" : "Login"}
      />
    </header>
  );
}
