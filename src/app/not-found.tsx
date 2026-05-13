"use client";

import React from "react";
import { Button } from "primereact/button";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex align-items-center justify-content-center min-h-screen surface-ground">
      <div className="flex flex-column align-items-center gap-4">
        <h1 className="text-9xl font-bold text-primary">404</h1>
        <p className="text-2xl text-600">Страница не найдена</p>
        <Button
          label="На главную"
          icon="pi pi-home"
          onClick={() => router.push("/")}
        />
      </div>
    </div>
  );
}
