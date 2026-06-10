/**
 * API Route Handlers для авторизации
 *
 * POST /api/auth/login   — вход по логину/паролю
 * POST /api/auth/refresh — обновление токенов
 * POST /api/auth/logout  — выход
 */

import { NextRequest, NextResponse } from "next/server";
import { bitrixRequest, BitrixApiError } from "@/auth/bitrixClient";
import { setAuthCookies, clearAuthCookies } from "@/auth/cookieService";
import {
  COOKIE_KEYS,
  AUTH_LOGIN_URL,
  AUTH_REFRESH_URL,
  AUTH_LOGOUT_URL,
} from "@/auth/constants";
import type { LoginCredentials, LoginResponse } from "@/types";

/**
 * POST /api/auth/login
 * Принимает логин/пароль, отправляет на Битрикс,
 * устанавливает cookies и возвращает объект пользователя
 */
async function handleLogin(request: NextRequest): Promise<NextResponse> {
  try {
    const credentials: LoginCredentials = await request.json();

    if (!credentials.login || !credentials.password) {
      return NextResponse.json(
        { error: "Login and password are required" },
        { status: 400 },
      );
    }

    const response = await bitrixRequest<LoginResponse>(AUTH_LOGIN_URL, {
      body: credentials,
    });

    await setAuthCookies(
      response.access_token,
      response.refresh_token,
      response.user,
    );

    return NextResponse.json({ user: response.user });
  } catch (error) {
    console.log("!!!!! Error !!", error);

    if (error instanceof BitrixApiError) {
      // Return the original error body from Bitrix as-is
      return NextResponse.json(error.body || { error: error.message }, {
        status: error.status,
      });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/auth/refresh
 * Берёт refresh_token из cookie, отправляет на Битрикс,
 * обновляет cookies с новыми токенами
 */
async function handleRefresh(request: NextRequest): Promise<NextResponse> {
  try {
    const refreshToken = request.cookies.get(COOKIE_KEYS.REFRESH_TOKEN)?.value;

    if (!refreshToken) {
      await clearAuthCookies();
      return NextResponse.json(
        { error: "Refresh token not found" },
        { status: 401 },
      );
    }

    const response = await bitrixRequest<LoginResponse>(AUTH_REFRESH_URL, {
      body: { refresh_token: refreshToken },
    });

    await setAuthCookies(
      response.access_token,
      response.refresh_token,
      response.user,
    );

    return NextResponse.json({ user: response.user });
  } catch (error) {
    // При ошибке — удаляем все cookies
    await clearAuthCookies();

    if (error instanceof BitrixApiError) {
      // Return the original error body from Bitrix as-is
      return NextResponse.json(error.body || { error: error.message }, {
        status: error.status,
      });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/auth/logout
 * Берёт access_token из cookie, уведомляет Битрикс,
 * удаляет все cookies. Завершается успехом даже при ошибке Битрикс.
 */
async function handleLogout(request: NextRequest): Promise<NextResponse> {
  try {
    const accessToken = request.cookies.get(COOKIE_KEYS.ACCESS_TOKEN)?.value;

    // Уведомляем Битрикс об инвалидации токена
    if (accessToken) {
      try {
        await bitrixRequest(AUTH_LOGOUT_URL, {
          body: { access_token: accessToken },
        });
      } catch {
        // Игнорируем ошибки Битрикс — всё равно удаляем cookies
      }
    }
  } finally {
    await clearAuthCookies();
  }

  return NextResponse.json({ success: true });
}

/**
 * Route handler — диспетчеризация по action из URL
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ auth: string[] }> },
): Promise<NextResponse> {
  const resolvedParams = await params;
  const action = resolvedParams.auth?.[0];

  switch (action) {
    case "login":
      return handleLogin(request);
    case "refresh":
      return handleRefresh(request);
    case "logout":
      return handleLogout(request);
    default:
      return NextResponse.json(
        { error: `Unknown auth action: ${action}` },
        { status: 404 },
      );
  }
}
