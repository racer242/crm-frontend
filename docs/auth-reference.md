# Справочник авторизации (NextJS + 1С Битрикс)

Система авторизации использует **1С Битрикс** как источник пользователей и **JWT** для аутентификации сессий.

---

## Архитектура

```
БРАУЗЕР                  NEXTJS SERVER              БИТРИКС
   │                          │                         │
   │  1. GET /login           │                         │
   │ ─────────────────────►   │                         │
   │                          │                         │
   │  2. HTML страница логина │                         │
   │ ◄─────────────────────── │                         │
   │                          │                         │
   │  3. POST /api/auth/login │                         │
   │     {login, password}    │                         │
   │ ─────────────────────►   │                         │
   │                          │  4. POST /api/auth/     │
   │                          │     {login, password}   │
   │                          │ ──────────────────────► │
   │                          │                         │
   │                          │                         │ 5. Валидация
   │                          │                         │    пользователя
   │                          │                         │    в БД Битрикс
   │                          │                         │
   │                          │  6. {access_token,      │
   │                          │      refresh_token,     │
   │                          │      user_data}         │
   │                          │ ◄────────────────────── │
   │                          │                         │
   │                          │ 7. Записывает токены    │
   │                          │    в httpOnly cookies   │
   │                          │                         │
   │  8. {user_data} + Set-Cookie                       │
   │ ◄─────────────────────── │                         │
   │                          │                         │
   │  9. Редирект на /dashboard                         │
   │                          │                         │
─────┼──────────────────────────┼─────────────────────────┼──────────
     │  ПОСЛЕДУЮЩИЕ ЗАПРОСЫ     │                         │
─────┼──────────────────────────┼─────────────────────────┼──────────
     │                          │                         │
     │  10. GET /dashboard      │                         │
     │      (cookie автоматически)                        │
     │ ─────────────────────►   │                         │
     │                          │ 11. Middleware проверяет│
     │                          │     access_token из     │
     │                          │     cookie              │
     │                          │                         │
     │                          │ [если токен валиден]    │
     │                          │                         │
     │  12. Рендер страницы     │                         │
     │ ◄─────────────────────── │                         │
     │                          │                         │
─────┼──────────────────────────┼─────────────────────────┼──────────
     │  REFRESH FLOW            │                         │
─────┼──────────────────────────┼─────────────────────────┼──────────
     │                          │                         │
     │  13. Запрос с истёкшим   │                         │
     │      access_token        │                         │
     │ ─────────────────────►   │                         │
     │                          │ 14. Токен истёк,        │
     │                          │     берём refresh_token │
     │                          │                         │
     │                          │ 15. POST /api/auth/refresh
     │                          │     {refresh_token}     │
     │                          │ ──────────────────────► │
     │                          │                         │
     │                          │ 16. {new_access_token}  │
     │                          │ ◄────────────────────── │
     │                          │                         │
     │                          │ 17. Обновляет cookie    │
     │                          │     Повторяет запрос    │
     │                          │                         │
     │  18. Нужный ответ        │                         │
     │ ◄─────────────────────── │                         │
     │                          │                         │
─────┼──────────────────────────┼─────────────────────────┼──────────
     │  LOGOUT FLOW             │                         │
─────┼──────────────────────────┼─────────────────────────┼──────────
     │                          │                         │
     │  19. POST /api/auth/logout                         │
     │ ─────────────────────►   │                         │
     │                          │ 20. POST /api/auth/logout
     │                          │     (инвалидация на     │
     │                          │      Битрикс)           │
     │                          │ ──────────────────────► │
     │                          │                         │
     │                          │ 21. Удаляет cookies     │
     │  22. Редирект /login     │                         │
     │ ◄─────────────────────── │                         │
```

## Ключевые принципы

- Все запросы к Битрикс идут **только с сервера NextJS**, никогда из браузера
- Токены хранятся исключительно в **httpOnly cookies** (кроме `user_data`, который нужен клиенту для AuthContext)
- **Proxy (middleware)** валидирует токен **локально** через `JWT_SECRET`, без сетевых запросов к Битрикс на каждый запрос
- Данные пользователя для UI читаются **на сервере** в `layout.tsx` и передаются в AuthProvider, чтобы исключить мигание меню
- `JWT_SECRET` — один и тот же на стороне Битрикс и NextJS

---

## API эндпоинты

| Метод | Путь                | Описание                                      |
| ----- | ------------------- | --------------------------------------------- |
| POST  | `/api/auth/login`   | Принимает логин/пароль, устанавливает cookies |
| POST  | `/api/auth/refresh` | Обновляет токены через refresh_token          |
| POST  | `/api/auth/logout`  | Удаляет cookies, уведомляет Битрикс           |

### Login

**Запрос:**

```json
POST /api/auth/login
Content-Type: application/json

{
  "login": "admin",
  "password": "password123"
}
```

**Успешный ответ (200):**

```json
{
  "user": {
    "id": "1",
    "login": "admin",
    "email": "admin@crm.test",
    "name": "Администратор",
    "avatar": "",
    "role": "admin",
    "groups": ["users", "admins"]
  }
}
```

Также устанавливаются три Set-Cookie:

- `access_token` (httpOnly, 15 мин) — JWT с полями `sub`, `login`, `email`, `name`, `avatar`, `role`, `groups`, `iat`, `exp`, `type: "access"`
- `refresh_token` (httpOnly, 7 дней) — JWT с теми же полями, `type: "refresh"`
- `user_data` (не httpOnly, 7 дней) — JSON-строка объекта User

**Ошибка (4xx):**

```json
{
  "error": "Неверный логин или пароль"
}
```

### Refresh

**Запрос:**

```json
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

Refresh_token передаётся в теле. При этом refresh_token также доступен в одноимённой httpOnly cookie — сервер также может взять его оттуда, если тело пустое.

**Успешный ответ (200):**

```json
{
  "user": {
    "id": "1",
    "login": "admin",
    "email": "admin@crm.test",
    "name": "Администратор",
    "avatar": "",
    "role": "admin",
    "groups": ["users", "admins"]
  }
}
```

Сервер обновляет все три cookie с новыми access_token и refresh_token.

**Ошибка (401):**

```json
{
  "error": "Refresh token not found"
}
```

При ошибке cookies удаляются.

### Logout

**Запрос:**

```json
POST /api/auth/logout
Content-Type: application/json

{
  "access_token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Успешный ответ (200):**

```json
{
  "success": true
}
```

Все три cookies удаляются. Если Bitrix недоступен — cookies всё равно удаляются.

---

## Proxy (middleware) — `src/proxy.ts`

Запускается при каждом HTTP-запросе к страницам (кроме `/api/*`, `/_next/*`, `/mocks/*`).

Логика:

1. Определить тип роута: защищённый, гостевой, остальные
2. Проверить `access_token` локально через `tokenService.verifyToken()`
3. Если результат `{ valid: true }` и токен скоро истекает — пробует refresh
4. Если результат `{ valid: false, reason: "expired" }` — пробует refresh
5. Если результат `{ valid: false, reason: "invalid" }` — сессии нет
6. Если `access_token` отсутствует, но `refresh_token` есть — пробует refresh
7. Защищённый роут без сессии → редирект на `/login?return_url=...`
8. Гостевой роут с сессией → редирект на `/`

Refresh в middleware выполняется **напрямую через bitrixClient**, без внутреннего HTTP-запроса к `/api/auth/refresh`, чтобы избежать цепочки request → fetch.

---

## tokenService — `src/auth/tokenService.ts`

Работа с JWT через библиотеку `jose`.

```typescript
// Результат верификации
export type TokenVerifyResult =
  | { valid: true; payload: TokenPayload }
  | { valid: false; reason: "expired" | "invalid" };

// Верификация — проверяет подпись и срок годности
verifyToken(token: string): Promise<TokenVerifyResult>;

// Декодирование без верификации (только для чтения)
decodeToken(token: string): TokenPayload | null;

// Проверка, истекает ли токен в ближайшие N минут
isTokenExpiringSoon(payload: TokenPayload, minutes?: number): boolean;

// Создание JWT (для тестирования)
createToken(payload, expiresIn: number): Promise<string>;
```

При верификации:

- Если подпись валидна и токен не истёк → `{ valid: true, payload }`
- Если подпись валидна, но `exp` просрочен → `{ valid: false, reason: "expired" }`
- Если подпись не совпадает или данные битые → `{ valid: false, reason: "invalid" }`

---

## Структура файлов

| Файл                                  | Назначение                                         |
| ------------------------------------- | -------------------------------------------------- |
| `src/auth/constants.ts`               | Ключи cookies, время жизни, списки protected/guest |
| `src/auth/bitrixClient.ts`            | HTTP клиент с `X-Internal-Secret`                  |
| `src/auth/tokenService.ts`            | Верификация JWT через `jose`                       |
| `src/auth/cookieService.ts`           | Установка/удаление httpOnly cookies                |
| `src/auth/getServerUser.ts`           | Чтение пользователя из токена (Server Components)  |
| `src/auth/AuthContext.tsx`            | React Context (AuthProvider + useAuth)             |
| `src/proxy.ts`                        | Middleware — проверка/refresh токенов, редиректы   |
| `src/app/login/page.tsx`              | Страница логина                                    |
| `src/app/api/auth/[...auth]/route.ts` | Route handler для login/refresh/logout             |

---

## Переменные окружения

| Переменная                     | По умолчанию                           | Описание                                         |
| ------------------------------ | -------------------------------------- | ------------------------------------------------ |
| `BITRIX_API_URL`               | (пусто)                                | URL для API 1С Битрикс                           |
| `BITRIX_INTERNAL_SECRET`       | (пусто)                                | Секретный ключ для внутренних запросов к Битрикс |
| `JWT_SECRET`                   | (пусто)                                | Секрет для верификации JWT-токенов               |
| `AUTH_COOKIE_NAMES`            | `access_token,refresh_token,user_data` | Имена cookie для токенов                         |
| `AUTH_TOKEN_LIFETIME_ACCESS`   | `900` (15 мин)                         | Время жизни access_token cookie (секунды)        |
| `AUTH_TOKEN_LIFETIME_REFRESH`  | `604800` (7 дней)                      | Время жизни refresh_token cookie (секунды)       |
| `AUTH_TOKEN_LIFETIME_USERDATA` | `604800` (7 дней)                      | Время жизни user_data cookie (секунды)           |
| `AUTH_PROTECTED_ROUTES`        | (пусто)                                | Список защищённых роутов (через запятую)         |
| `AUTH_GUEST_ROUTES`            | `/login`                               | Список гостевых роутов (через запятую)           |
| `AUTH_MAX_REFRESH_ATTEMPTS`    | `1`                                    | Максимальное количество попыток refresh          |
| `AUTH_LOGIN_URL`               | `/api/auth/login`                      | URL для login route handler                      |
| `AUTH_LOGOUT_URL`              | `/api/auth/logout`                     | URL для logout route handler                     |
| `AUTH_REFRESH_URL`             | `/api/auth/refresh`                    | URL для refresh route handler                    |

---

## Порядок проверки после изменений

1. Успешный логин → появились три cookie, редирект в дашборд
2. Неверные данные → ошибка на форме, cookies не установлены
3. Открыть защищённую страницу без авторизации → редирект на `/login`
4. Открыть `/login` с авторизацией → редирект на `/`
5. Logout → cookies удалены, редирект на `/login`
6. Меню отображает имя и аватар без мигания при загрузке
7. Через 15 минут запрос не падает — middleware делает refresh
8. После 7 дней бездействия — редирект на `/login`
