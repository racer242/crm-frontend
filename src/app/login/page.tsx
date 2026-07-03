"use client";

/**
 * Страница логина
 * Клиентский компонент. Использует useAuth() для вызова login().
 * После успешного входа делает router.push(returnUrl) и router.refresh().
 *
 * useSearchParams требует Suspense границы,
 * поэтому страница логина разделена на обёртку (LoginPage) и содержимое (LoginForm).
 */

import React, { Suspense, useRef } from "react";

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
import { useTranslations } from "next-intl";
import { useAuth } from "@/auth/AuthContext";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { classNames } from "primereact/utils";
import { parseApiError } from "@/utils/parseApiError";

function LoginForm() {
  const t = useTranslations("login");
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("return_url") || "/";

  const toastRef = useRef<Toast>(null);
  const navigatingRef = useRef(false);

  const [loginField, setLoginField] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setSubmitted(true);

      if (!loginField || !password) return;
      if (isLoading || navigatingRef.current) return;

      try {
        await login({ login: loginField, password }, returnUrl);
        navigatingRef.current = true;
        toastRef.current?.show({
          severity: "success",
          summary: t("success"),
          detail: t("loginSuccess"),
          life: 2000,
        });
      } catch {
        // Ошибка уже установлена в контексте и будет показана через useEffect
      }
    },
    [loginField, password, login, returnUrl, isLoading, t],
  );

  // Показываем ошибки из контекста через toast
  React.useEffect(() => {
    if (error) {
      toastRef.current?.show({
        severity: "error",
        summary: t("error"),
        detail:
          parseApiError(error).message || parseApiError(error).rawText || error,
        life: 4000,
      });
    }
  }, [error, t]);

  // Если уже авторизован — перенаправляем
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push(returnUrl);
    }
    return () => {
      navigatingRef.current = false;
    };
  }, [isAuthenticated, router, returnUrl]);

  return (
    <div className="flex align-items-center justify-content-center min-h-screen surface-ground">
      <div className="surface-card w-full sm:max-w-30rem min-h-auto p-5 sm:shadow-2 sm:border-round flex flex-column">
        <div className="text-center mb-5">
          <h2 className="text-2xl font-bold mb-2">{t("title")}</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-column gap-4">
          <Toast ref={toastRef} />

          {/* Login field */}
          <div className="flex flex-column gap-2">
            <label htmlFor="login">{t("loginLabel")}</label>
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
              <small className="p-error">{t("loginRequired")}</small>
            )}
          </div>

          {/* Password field */}
          <div className="flex flex-column gap-2">
            <label htmlFor="password">{t("passwordLabel")}</label>
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
              <small className="p-error">{t("passwordRequired")}</small>
            )}
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            label={t("signIn")}
            icon="pi pi-sign-in"
            loading={isLoading}
            className="w-full"
          />
        </form>
      </div>
    </div>
  );
}
