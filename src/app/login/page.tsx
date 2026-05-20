"use client";

/**
 * Страница логина
 * Клиентский компонент. Использует useAuth() для вызова login().
 * После успешного входа делает router.push(return_url) и router.refresh().
 *
 * useSearchParams требует Suspense границы,
 * поэтому страница логина разделена на обёртку (LoginPage) и содержимое (LoginForm).
 */

import React, { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex align-items-center justify-content-center min-h-screen surface-ground">
          <i className="pi pi-spin pi-spinner" style={{ fontSize: "2rem" }} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

import { useState, useCallback, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/auth/AuthContext";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { classNames } from "primereact/utils";

function LoginForm() {
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const return_url = searchParams.get("return_url") || "/";

  const [loginField, setLoginField] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setSubmitted(true);

      if (!loginField || !password) {
        return;
      }

      try {
        await login({ login: loginField, password }, return_url);
      } catch {
        // Ошибка уже установлена в контексте
      }
    },
    [loginField, password, login, return_url],
  );

  // Если уже авторизован — перенаправляем
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push(return_url);
    }
  }, [isAuthenticated, router, return_url]);

  return (
    <div className="flex align-items-center justify-content-center min-h-screen surface-ground">
      <div className="surface-card p-5 shadow-2 border-round w-full max-w-md">
        <div className="text-center mb-5">
          <h2 className="text-2xl font-bold mb-2">CRM Login</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-column gap-4">
          {/* Login field */}
          <div className="flex flex-column gap-2">
            <label htmlFor="login">Login</label>
            <InputText
              id="login"
              value={loginField}
              onChange={(e) => {
                setLoginField(e.target.value);
                clearError();
              }}
              className={classNames({ "p-invalid": submitted && !loginField })}
              autoFocus
            />
            {submitted && !loginField && (
              <small className="p-error">Login is required</small>
            )}
          </div>

          {/* Password field */}
          <div className="flex flex-column gap-2">
            <label htmlFor="password">Password</label>
            <Password
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError();
              }}
              feedback={false}
              toggleMask
              className={classNames({
                "p-invalid": submitted && !password,
              })}
            />
            {submitted && !password && (
              <small className="p-error">Password is required</small>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 border-round bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            label="Sign In"
            icon="pi pi-sign-in"
            loading={isLoading}
            className="w-full"
          />
        </form>
      </div>
    </div>
  );
}
