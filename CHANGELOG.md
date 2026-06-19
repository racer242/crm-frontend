# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **Menubar `activeItemId` prop** — new optional prop for highlighting active menu items with `p-focus` class. The parameter is extracted from props and does not pass through to the PrimeReact component. **Only applies to top-level menu items.**
  - `src/engine/components/NavComponents.tsx` — updated `renderMenubar` to extract `activeItemId` from props, add `p-focus` className to matching item by `id`
  - `docs/components-reference.md` — added `activeItemId` documentation to Menubar section

### Changed

- **InputMask component** — new masked input component based on `primereact/inputmask` for formatted data entry (phones, dates, cards, etc.):
  - `src/engine/components/InputComponents.tsx` — added `renderInputMask` function with local state pattern
  - `src/engine/components/index.ts` — exported `renderInputMask`
  - `src/engine/ComponentRenderer.tsx` — registered `InputMask` case
  - `src/types/component.ts` — added `"InputMask"` to `ComponentType` union
  - `docs/components-reference.md` — added InputMask documentation with mask examples
  - `config/pages/user-edit.json` — replaced `InputText` with `InputMask` for phone field using mask `(999) 999-9999`

- **user-edit page: Save and Apply buttons** — added two separate buttons in user edit page:
  - "Сохранить" button saves data and navigates to user detail page (`/users/{user_id}`)
  - "Применить" button saves data without navigation (stays on edit page)
  - Extracted save logic into reusable `saveUserGroups` shortcut to avoid code duplication
  - `config/pages/user-edit.json` — added `shortcuts.saveUserGroups` with sequence command, updated buttons section

- **BlockRenderer Panel header-less styling via CSS class** — when header is not set, adds `.no-header-panel-content` class to `.p-panel-content` element via PrimeReact passthrough (pt) API (commit `[to-be-added]`)
  - `src/engine/BlockRenderer.tsx` — case "Panel" uses `pt.content.className` to inject custom class when `wrapperProps.header` is missing
  - `src/app/globals.css` — new `.no-header-panel-content` class with `border-top`, `border-top-left-radius`, `border-top-right-radius` styles

### Fixed

- **Cursor jumping to end when typing in the middle of input fields** — Applied local state pattern to all input components in `src/engine/components/InputComponents.tsx`:
  - `renderInputText` — InputText with local state
  - `renderInputNumber` — InputNumber with local state
  - `renderInputTextarea` — InputTextarea with local state
  - `renderPassword` — Password with local state

  All components now use `useState` for `localValue` and sync with external `props.value` via `useEffect`. This prevents React from overwriting the input value on every re-render caused by Linkage subscription, which was causing the cursor to jump to the end. The fix follows the same pattern as `renderInputTextWithThrottle` but without the delay — `handleEvent("onChange")` is called immediately.
  - First render skip: `isFirstRender` ref prevents overwriting initial `useState` value
  - External changes (from `dataFeed`, `setProperty`) still sync correctly via `useEffect` dependency on props value

### Added

- **Inline-линковка `{ @... }` в строки** — линковку теперь можно вставлять в произвольную строку, оборачивая в фигурные скобки: `"/users/{@state.userData.id}"` → `"/users/42"`. Поддерживается любое количество вставок в одной строке. Реактивность работает через `subscribe()` — изменения отслеживаются автоматически.
  - `src/types/linkage.ts` — добавлены `hasInlineBindings()`, `extractInlineBindings()`
  - `src/core/Linkage.ts` — добавлен `resolveInline()`, изменён `resolveDeep()` и `subscribe()` для поддержки inline-линковок

- **Calc Engine — утилита трансформации данных** — позволяет описывать вычисляемые значения в конфигурации: склейка строк, условный выбор, значение по умолчанию, форматирование. Calc-выражения реактивны.
  - `src/types/calc.ts` — типы CalcOperation, isCalcOperation, CalcHandler, CalcRegistry
  - `src/core/CalcEngine.ts` — класс с 5 встроенными операциями: join, concat, if, default, format. Поддерживает регистрацию кастомных операций.
  - `src/core/Linkage.ts` — интеграция CalcEngine в resolveDeep
  - `docs/calc-reference.md` — полная документация по Calc Engine
  - `docs/linkage-reference.md` — раздел "Inline-линковка (внутри строки)"

- **Страница редактирования участника `/users/[id]/edit`** — новая страница с формой редактирования данных участника (commit `[to-be-added]`)
  - `config/pages/user-edit.json` — конфигурация страницы: маршрут `/users/[user_id]/edit`, dataFeed для загрузки данных через существующий адаптер `user.response.js`, форма с группировкой полей по панелям
  - **Личные данные**: Имя (InputText), Фамилия (InputText), E-mail (InputText с keyfilter="email"), Телефон (InputText с keyfilter="int")
  - **Адрес доставки**: Адрес (InputText), Комментарий (InputTextarea)
  - **Группа**: MultiSelect с динамическими option из `groupOptions` (все группы) и `selectedGroups` (выбранные)
  - **Статус**: InputSwitch (Заблокировать/Разблокировать), InputTextarea (Причина блокировки)
  - **Панель кнопок**: Сохранить (с двумя последовательными вызовами: PATCH `/api/users/[id]` → PUT `/api/users/[id]/groups`) с блокадой кнопки через `state.saving`, Отменить (navigate на страницу пользователя, сброс изменений)
  - Обработка ошибок: onError/toast для каждой стадии сохранения
  - `config/adapters/user.js` — расширен: добавлены `groupOptions`, `selectedGroups`, `delivery_address`, `delivery_comment`
  - `config/adapters/user-edit-request.js` — новый request-адаптер для формирования PATCH-payload
  - `config/crm-config.json` — зарегистрирован адаптер `user-edit.request.js` и реф страницы `./pages/user-edit.json`

### Fixed

- **Filtered internal props from being passed to PrimeReact components** — removed internal configuration properties (`components`, `columns`, `tabs`, `grid`, `containerClassName`, `label`, `labelClassName`, `labelStyle`) from being spread into PrimeReact component props, which was causing potential warnings and unexpected behavior
  - `src/engine/components/ContainerComponents.tsx` — updated `renderTabView`, `renderAccordion`, `renderCarousel`, `renderPanel` to filter internal props before passing to PrimeReact
  - `src/engine/components/LayoutComponents.tsx` — updated `renderLayoutGroup`, `renderLabelledGroup` to filter internal props before passing to DOM elements
  - `src/engine/components/DataTableComponent.tsx` — updated `renderDataTable` to exclude `columns` from spread props
  - `src/engine/components/CardComponents.tsx` — updated `renderCard` to exclude `components` from spread props

### Added

- **Panel component in ContainerComponents** — added `renderPanel` function that wraps PrimeReact Panel with child components rendering, supporting grid layout similar to renderLabelledGroup (commit `[to-be-added]`)
  - `src/engine/components/ContainerComponents.tsx` — new `renderPanel` function with Panel wrapper and components rendering
  - Supports `props.components` array for nested components
  - Supports `props.grid` for grid-based layout (col classes + padding)
  - Supports `props.containerClassName` for customizing the inner container class (default: `"flex flex-column gap-2"`)
  - Label handling delegated to Panel's own props (no separate label prop)
  - Exported from `src/engine/components/index.ts`
  - Registered as `"Panel"` case in `ComponentRenderer.tsx`

### Added

- **StatCard — готовая карточка статистики для дашбордов** — `src/engine/components/CardComponents.tsx`: добавлена новая функция `renderStatCard`, которая рендерит PrimeReact `Card` с иконкой справа вверху, заголовком (мелкий текст), значением (крупный жирный текст) слева и опциональным `subTitle`. Зарегистрирован как `"StatCard"` в `ComponentType`, экспортирован и подключён в `ComponentRenderer.tsx`.
  - Props: `title`, `subTitle`, `value`, `icon` (класс PrimeIcon), `iconColor` (цвет иконки, по умолчанию `--primary-color`).
  - Настраиваемые классы: `titleClassName` (`"text-lg font-semibold text-900 mb-1"`), `subTitleClassName` (`"text-xs text-500 mb-2"`), `valueClassName` (`"text-3xl font-bold text-900"`), `iconClassName` (`"text-3xl"`).
  - Padding убран через `pt={{ content: { className: "p-0" } }}`.
  - `ml-3` на иконке для отступа от текста.

### Added

- **LayoutComponents — два новых компонента для группировки и лэйаута** — `src/engine/components/LayoutComponents.tsx`: добавлены `LayoutGroup` (контейнер-группировщик дочерних компонентов) и `LabelledGroup` (контейнер с настраиваемой меткой). Поддерживают PrimeFlex grid-раскладку через `props.grid`. `LabelledGroup` поддерживает управление расположением метки через `className`/`style` внешнего `<div>` и `containerClassName` для контейнера с компонентами. Также поддерживаются `labelClassName` и `labelStyle` для кастомизации метки. Зарегистрированы как `"LayoutGroup"` и `"LabelledGroup"` в `ComponentType`, подключены в `ComponentRenderer.tsx`.

### Changed

- **`rightColumnBlock` в `config/pages/user.json` переработан** — детали пользователя (ID, Telegram ID, Реферал, IP, Регистрация, Авторизация) выведены в DataTable без хедера (первый столбец — название параметра, второй — значение через линковку). Статус и причина блокировки вынесены в отдельную панель (Card) под таблицей.

- **`renderLabelledGroup` и `renderLayoutGroup` рефакторены** — `className` и `style` теперь применяются к внешнему оборачивающему `<div>`, а для внутреннего контейнера с компонентами используется новый пропс `containerClassName`. Удалён `labelPosition` из `LabelledGroup` — расположение метки управляется через CSS-классы внешнего дива (`"flex flex-column gap-1"` для вертикального, `"flex align-items-start gap-3"` для горизонтального). Обновлена документация в `docs/components-reference.md`.

- **`leftColumnBlock` в `config/pages/user.json` переработан с использованием LayoutComponents** — `userAvatar` и `userFullName` объединены в `LayoutGroup` с `containerClassName: "flex flex-column md:flex-row gap-3 align-items-center"` для перехода в ряд на md+. `userEmail`, `userPhone`, `userCity` обёрнуты в `LabelledGroup` с `className: "flex flex-column gap-1"` и соответствующими лейблами (Email, Телефон, Город).

- **`CardComponent.tsx` renamed to `CardComponents.tsx`** — файл переименован с единственного на множественное число, поскольку содержит два компонента (`renderCard` и `renderStatCard`). Обновлён импорт в `src/engine/components/index.ts`.

- **Added `grid` config to Section — replaces CSS gap with wrapper padding** — `src/engine/SectionRenderer.tsx`, `src/types/section.ts`: added new `GridConfig` interface and `grid` field on `Section`. When `section.grid` is specified, blocks are wrapped in `<div>` elements with `col-*` classes from `grid.cols` and optional padding class from `grid.padding`. Section gets `grid grid-nogutter` classes. This solves the PrimeFlex gap issue where `gap` breaks column width calculation. Updated `docs/config-reference.md` with GridConfig documentation. Migrated `config/pages/user.json` — `mainLayout` section now uses `grid` config instead of `className: "grid gap-3"` with col-classes on blocks.

- **Added `grid` config to Block — same wrapper-based layout for components** — `src/engine/BlockRenderer.tsx`, `src/types/block.ts`: `GridConfig` interface extracted to `src/types/grid.ts` and re-used on Block level. When `block.grid` is specified, components are wrapped in `<div>` elements with `col-*` classes from `grid.cols` and optional padding from `grid.padding`. Migrated `config/pages/user.json` — `statCards` and `achievementsGrid` blocks now use `grid` config instead of inline grid className with col-classes on components. Updated `docs/config-reference.md` with Block-level GridConfig example.

- **Removed unused `component.value` bindings from `useComponentBindings`** — `src/engine/hooks/useComponentBindings.ts`: `component.value` was being collected in `allBindings`, resolved via Linkage into `resolvedProps.value`, and listed as a dependency, but `resolvedProps.value` was never consumed anywhere — all data comes through `component.props`. Removed the value collection, resolution, and dependency tracking to eliminate unnecessary computations.

### Fixed

- **`getPublicEnv()` returns empty object on client** — `src/utils/env.ts`: `getPublicEnv()` used `Object.entries(process.env)` which does not work in Next.js browser bundles. Webpack's DefinePlugin only replaces literal `process.env.NEXT_PUBLIC_*` expressions at build time; dynamic iteration over `process.env` yields an empty object on the client because the `process.env` object is not enumerable in the browser bundle. Fixed by explicitly listing each known `NEXT_PUBLIC_*` variable as a literal `process.env.NEXT_PUBLIC_*` reference (`NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_USE_SYSTEM_FONTS`). Any new `NEXT_PUBLIC_*` variable must be added to this list.

- **Страница просмотра пользователя `/users/[id]`** — страница выводит все доступные данные участника согласно эндпойнту (commit `[to-be-added]`)
  - `config/pages/user.json` — переписана с фейковых секций на реальные: основная информация (ФИО, email, телефон, город, реферал, даты, IP), статус блокировки и группы, статистика (баллы, призы, чеки, коды, ЧЗ, продукты, сообщения), детальный блок баллов
  - `dataFeed` — два параллельных запроса: `/api/users/{id}` и `/api/users/{id}/points` через API Router c макросом `{$location.param.0}`
  - `config/adapters/user.js` — новый JS-адаптер для трансформации ответа: склеивание full_name, форматирование дат, сбор текста групп
  - `config/crm-config.json` — зарегистрирован адаптер `user.response.js`

### Added

- **Страница просмотра пользователя `/users/[id]` — responsive редизайн** — страница пользователя переработана для корректного отображения на desktop и mobile (commit `[to-be-added]`)
  - `config/pages/user.json` — полная переработка: PrimeFlex grid-сетка (`col-12 md:col-6 lg:col-4`) для карточек информации, заменены read-only InputText на Text/Chip/Tag/Avatar, добавлены кнопки действий (редактировать, заблокировать/разблокировать, группы), conditional visibility для блокировки, подтверждение через confirm, shortcodes для блокировки/разблокировки, flex-wrap для header на mobile
  - `config/adapters/user.js` — расширен: добавлены initials, статус label/severity/icon, groups_badges, stats-массив для чиповой статистики

- **5 новых страниц: Акты, Призы, Чеки, Коды, Коды Честный Знак** — табличные страницы-списки с пагинацией, фильтрацией, поиском (commit `[to-be-added]`)
  - `config/pages/acts.json` — страница "Акты" (колонки: win_date, prize, status; фильтры: status options, win_date period)
  - `config/pages/prizes.json` — страница "Призы" (колонки: win_date, prize, retail_chain, status, comment; фильтры: status, prize_type, retail_chain options, win_date period)
  - `config/pages/receipts.json` — страница "Чеки" (колонки: registration_date, purchase_date, promo_products_count, promo_products_amount, retail_chain, moderation_status; фильтры: moderation_status, retail_chain options, registration_date, purchase_date period, promo_products_amount range)
  - `config/pages/codes.json` — страница "Коды" (колонки: user_id, user_name, email, registration_date, code; фильтры: registration_date period, code text)
  - `config/pages/gtins.json" — страница "Коды Честный Знак" (колонки: user_id, user_name, email, registration_date, gtin, product, amount, status; фильтры: status options, registration_date period)
- **Пункты навигации в sidebar** — `config/crm-config.json`: добавлены пункты Акты, Призы, Чеки, Коды, Коды ЧЗ после "Участники"
- **Адаптеры request/response для новых страниц** — `config/crm-config.json`: acts.request.js, acts.response.js, prizes.request.js, prizes.response.js, receipts.request.js, receipts.response.js, codes.request.js, codes.response.js, gtins.request.js, gtins.response.js (переиспользуют users-params.js и users-2-tabview.js)
- **API routes adapter registration** — `config/system/api-routes.json`: добавлены adapter поля для GET-роутов acts, prizes, receipts, codes, gtins

### Added

- **FormatEngine PopIfHasNullProps type** — new formatting type for filtering array elements with null/undefined properties (commit `[to-be-added]`)
  - `PopIfHasNullProps` in `FormatType` — removes array elements where at least one specified property is null or undefined
  - `params.props` accepts array of property paths to check
  - Non-array input → returned unchanged
  - Element removed if ANY of the specified properties is null/undefined
  - Supports nested property paths via PathResolver

- **FormatEngine RemoveProps type** — new formatting type for removing properties from objects/arrays (commit `[to-be-added]`)
  - `RemoveProps` in `FormatType` — removes specified properties from input value
  - `params` accepts array of property paths (e.g., `["id", "internal.secret"]`)
  - Date objects → returned unchanged
  - Non-object/non-array values → returned unchanged
  - Arrays → applies removal to all elements recursively
  - Objects → deletes listed properties via `PathResolver.deleteValue` (supports nested paths)
  - `PathResolver.deleteValue()` — new method for complete property deletion using `delete` operator

### Fixed

- **API Router: token expiration causes 401 on long-lived pages** — `src/app/api/[...route]/route.ts` now refreshes expired or expiring Bitrix access tokens before forwarding requests to external APIs. The fix mirrors the mechanism used in `src/proxy.ts` (middleware):
  - Added `tryRefreshToken()` — calls Bitrix refresh endpoint directly via `bitrixClient` (without internal HTTP request), returns new token pair
  - Added `setCookiesOnResponse()` — sets updated `access_token`, `refresh_token`, and `user_data` cookies on the response
  - Modified `buildFetchOptions()` — accepts optional `accessTokenOverride` to use a refreshed token
  - Token check flow before external API call: verify JWT locally via `verifyToken()`, if expired or expiring soon → refresh via `tryRefreshToken()`, then use new token and set updated cookies on response

- **CommandExecutor: URL params serialize objects incorrectly** — `setUrlParams`, `mergeUrlParams`, and `setUrlParam` commands in `src/core/CommandExecutor.ts` were passing object values as `[object Object]` when using `String(value)`. Added a new private method `serializeUrlValue()` that properly serializes values for URL query parameters:
  - `null`/`undefined` → skip the parameter
  - `Date` → readable string (e.g., `"2026-06-11T14:00:00.000Z"`)
  - Objects/arrays → `JSON.stringify(value)`
  - Primitives → `String(value)`
    This matches the existing behavior in `buildUrlWithParams` from `src/utils/http.ts`.

### Added

- **API Router dynamic route matching and `{$location.routeParams.*}` macros** — `src/app/api/[...route]/route.ts` now supports pattern matching for routes with dynamic segments like `users/[id]`. Route params are automatically extracted from the URL and made available to URL macros via `{$location.routeParams.id}`.
  - `findRouteConfig` rewritten to match route patterns and return `{ config, routeParams }`.
  - `serverSources` now includes `location` built from the incoming request, enabling `{$location.*}` macros in route URLs.
  - `api-routes.json` — all `{id}`/`{product_id}` placeholders replaced with `{$location.routeParams.id}`/`{$location.routeParams.product_id}` macros.
  - `types/macro.ts` — documented `location.routeParams`, `location.params`, `location.param` in supported macro prefixes.

### Fixed

- **FiltersPanel: changes discarded on close, buttons disabled incorrectly** — Two bugs in `FiltersPanelComponent.tsx`:
  - **Bug 1**: When closing the filter panel without applying, local edits were not discarded. Fixed by copying `externalFilters` into `localFilters` on every open (using `prevVisibleRef` to detect open transition) instead of the previous broken `JSON.stringify` comparison logic.
  - **Bug 2**: "Apply" and "Clear" buttons were disabled based on `hasActiveFilters` (whether any filter has a selected value), making them unresponsive when the user unselected the last active filter. Fixed by storing `originalFilters` on panel open and computing `hasChanges` via deep comparison (`JSON.stringify(localFilters) !== JSON.stringify(originalFilters)`). Buttons are now active whenever the user has made any changes to the filters, regardless of whether any values are selected.

- **Double error toast on client-side navigation** — React Strict Mode double-invokes `useEffect` in development mode. Two separate mechanisms caused double toasts:
  - `src/engine/AppEngine.tsx`: `initialErrors` toast — added `shownErrorsRef` (`useRef<string[]>`) to track already-shown errors and prevent Strict Mode duplicate. Only new errors that haven't been shown before trigger Toast notifications.
  - `src/engine/hooks/useDataFeedErrors.ts`: refactored to use reference-identity (`prevDataFeedErrorsRef`) and `hasShownRef` flag instead of error-text comparison. Previously, filtering by `.includes()` blocked toasts when the same error text occurred in a subsequent `sendRequest` call. Now each new `sendRequest` error payload (new array reference) always triggers toasts, regardless of error text, while Strict Mode double-invoke is still blocked.
  - Both fixes are semantically identical: new payload → show toasts; same reference (Strict Mode double-invoke) → block.

### Added

- **API routes collected from `.prompts/docs/api/`** — 37 routes compiled into `config/system/api-routes.json` with `{$env.API_CAMP_URL_0}` macro format across all CRM resource groups (stats, users, prizes, receipts, acts, codes, gtins). Adapters not yet specified.
  - `config/system/api-routes.json` — full route listing
  - `.env.example` — new `API_CAMP_URL_0` configurable param for campaign API base URL
  - `src/core/config.ts` — startup banner extended with `Camp URL` status line

### Changed

- **`access_token` injected into external API requests** — user's Bitrix access_token is now automatically forwarded to all external API requests for authenticated access:
  - `src/utils/getAccessToken.ts` (new) — utility for reading access_token from cookies, with two modes: `getAccessTokenFromRequest()` for Route Handlers and `getAccessTokenServer()` for Server Components
  - `src/app/api/[...route]/route.ts` — API Router now reads access_token from httpOnly cookies and injects `Authorization: Bearer <token>` into outgoing external API requests
  - `src/core/DataFeedServerService.ts` — `executeServerDataFeeds()` now accepts optional `authToken` parameter; if provided, adds `Authorization: Bearer` header to all outgoing requests
  - `src/app/[[...slug]]/page.tsx` — reads access_token via `getAccessTokenServer()` and passes it to `executeServerDataFeeds()`
  - `src/core/config.ts` — startup banner extended with `Auth` and `Auth API` status lines
  - `README.md` — API Router section updated with access_token injection documentation

### Changed

- **`apiRoutes` moved from `config{}` to root level in `crm-config.json`** — `apiRoutes` are server-side only (external API URLs with adapters), not meant for client. Removed from `AppConfig` interface (`src/types/app.ts`), added to `App` interface. Updated `DataFeedServerService.ts` and `api/[...route]/route.ts` to read from `config.apiRoutes` instead of `config.config?.apiRoutes`. Stripped `apiRoutes` from client-bound config in `page.tsx` via destructuring.
- **`apiRoutes` extracted to separate file `config/system/api-routes.json`** — the `apiRoutes` array in `crm-config.json` replaced with `{ "$ref": "./system/api-routes.json" }`. The `config/system/` directory created for service/system includes.
- **`getServerEnv()` and `getPublicEnv()` split in `src/utils/env.ts`** — `getServerEnv()` is now async, server-only (throws on client), and returns ALL `process.env` variables without filtering. New `getPublicEnv()` is sync, safe for client, returns whatever is available in `process.env` (on client: only `NEXT_PUBLIC_*`). Updated callers: `src/app/api/[...route]/route.ts` uses `await getServerEnv()`, `src/core/DataFeedService.ts` and `src/core/CommandExecutor.ts` use `getPublicEnv()`.

### Removed

- **Dead code cleaned up** — `src/core/DataFeedService.ts` and `src/core/index.ts`:
  - Removed commented-out `resolveUrl()` function (unused — only called inside the removed `executeDataFeed`)
  - Removed commented-out `executeDataFeed()` and `executePageDataFeeds()` functions (replaced by client-side `executeClientDataFeed()` and server-side `executeServerDataFeeds()` in `DataFeedServerService.ts`)
  - Removed commented-out `executeDataFeed` / `executePageDataFeeds` re-exports from barrel `index.ts`
  - Cleaned up unused `DataFeedConfig` and `ApiRouteConfig` imports from `DataFeedService.ts`

### Changed

- **Mock users data simplified** — `public/mocks/api/users/users.json`:
  - Column props stripped down to style-only (removed `field`, `header`, `sortable`, `dataType`)
  - Row IDs changed from strings (`"user_1024"`) to numeric (`1024`)
  - Row-level `props` (`class`, `disabled`) removed
  - Date format changed from ISO (`2026-05-14T09:23:15Z`) to simple datetime (`2026-05-14 09:23:15`)
  - Filter values populated with test data for UI preview

### Fixed

- **User name and role lost after page refresh** — `src/auth/getServerUser.ts`: server-side user retrieval now reads full `User` data from `user_data` cookie (non-httpOnly, set at login/refresh) instead of relying solely on JWT claims, which may not contain `name`, `role`, or `groups`. Falls back to JWT claims if `user_data` cookie is absent.

### Changed

- **Base64-encoding for BITRIX_INTERNAL_SECRET and JWT_SECRET** — `.env.local`, `.env.production`: secrets now stored in Base64 with `Base64_` prefix + raw value backup comments. `src/auth/secretUtils.ts` — new `decodeSecret()` utility. `src/auth/bitrixClient.ts`, `src/auth/tokenService.ts` — call `decodeSecret()` before using. `.env.example` — added Base64 usage example. `README.md`, `docs/auth-reference.md` — added Base64 notes. Non-Base64 values are still supported for backward compatibility.

### Fixed

- **Duplicate error toast and MISSING_MESSAGE on login failure** — `src/app/login/page.tsx`: removed error toast from `handleSubmit` catch block to prevent double toast; the error is now shown exclusively via `useEffect` on `error` context change with the server-provided error message. Removed unused `t("loginFailed")` call that caused `MISSING_MESSAGE` error (the key exists under `auth` namespace, not `login`).

### Changed

- **Login page toast notifications & button lock** — `src/app/login/page.tsx`:
  - Added PrimeReact `Toast` component for success/error messages instead of raw error div
  - Added `navigatingRef` to block the submit button after successful login until navigation completes, preventing duplicate API calls
  - `messages/ru.json` and `messages/en.json` — added `loginSuccess`, `success`, `error` translation keys under `login` namespace

### Fixed

- **`{$config.baseURL}` macro resolution error on `/statistics` page** — `BASE_URL` env var renamed to `NEXT_PUBLIC_BASE_URL` because `getServerEnv()` only exposes `NEXT_PUBLIC_*` variables for server-side macro resolution. The macro in `config/crm-config.json` was `{$env.BASE_URL}` but `BASE_URL` was filtered out, causing `{$config.baseURL}` to remain unresolved and produce an invalid URL `{$config.baseURL}/mocks/api/stats/review.json`. Fixed by:
  - `.env.local`: `BASE_URL` → `NEXT_PUBLIC_BASE_URL`
  - `config/crm-config.json`: `{$env.BASE_URL}` → `{$env.NEXT_PUBLIC_BASE_URL}`

### Added

- **`deploy/CentOS7/deploy-remote-configure.sh`** — новый скрипт для обновления конфигурации на удалённом сервере без пересборки Docker-образа. Копирует `config/`, `messages/`, `.env.production`, `docker-compose.yml` и перезапускает контейнер через `docker compose up -d`. Основан на `deploy-remote.sh`, но без этапов сборки, загрузки образа и установки nginx-конфига.
  - `README.md` — добавлена ссылка на reconfigure script в разделе HTTPS

### Fixed

- **`.env.production` removed from git tracking** — `.gitignore` had `!.env.production` (negation rule), which explicitly allowed `.env.production` to be tracked. Fixed by changing `!.env.production` → `.env.production` in `.gitignore`. File removed from git tracking with `git rm --cached .env.production`.

### Added

- **HTTPS support via nginx reverse proxy** — приложение теперь доступно по HTTPS через nginx на домене `dev.ssd26.srv08.ru:3030`
  - `docker-compose.yml` — порт контейнера привязан только к localhost (`127.0.0.1:${HOST_PORT:-3030}:3000`)
  - `.env.production` — добавлен `BASE_URL="https://dev.ssd26.srv08.ru:3030"`
  - `.env.local` — добавлен `BASE_URL=http://localhost:3000`
  - `.env.example` — добавлен `BASE_URL=`
  - `config/crm-config.json` — `baseURL` теперь использует макрос `{$env.BASE_URL}` вместо hardcoded HTTP URL
  - `deploy/nginx-crm.conf` — новый nginx-конфиг с SSL и reverse proxy на 127.0.0.1:3030 и HTTP→HTTPS redirect
  - `deploy-remote.sh`:
    - Удалён небезопасный блок установки Docker на удалённом сервере
    - Порт по умолчанию изменён на 3030
    - Вывод URL изменён на `https://dev.ssd26.srv08.ru:3030`
    - Добавлено копирование nginx-конфига на сервер
  - `deploy/CentOS7/nginx-crm.conf` — новый nginx-конфиг для Bitrix окружения (CentOS 7), порт 3003
  - `deploy/CentOS7/deploy-remote.sh` — скрипт деплоя для CentOS 7 с установкой nginx-конфига в `/etc/nginx/bx/site_avaliable/`
  - `.env.production` — `BASE_URL` изменён на `https://dev.ssd26.srv08.ru:3003`
  - `README.md` — раздел HTTPS переписан для CentOS 7 / Bitrix окружения с портом 3003
  - Старый `deploy/nginx-crm.conf` и корневой `deploy-remote.sh` оставлены для обратной совместимости

### Fixed

- **JWT token refresh on expiration** — fixed `proxy.ts` (middleware) to properly detect expired access tokens and attempt refresh via `tryRefreshToken()` before redirecting to login
  - `src/auth/tokenService.ts` — `verifyToken()` now returns `TokenVerifyResult` with reason: `"expired"` or `"invalid"`, enabling proxy to distinguish between expired and malformed tokens
  - `src/proxy.ts` — added refresh attempts for expired tokens (cookie missing but refresh_token present) and expired-but-still-verifiable tokens; invalid tokens immediately redirect to `/login`; removed debug console.logs
  - `src/auth/getServerUser.ts` — simplified to use new `verifyToken()` result type, removed fallback `decodeToken()` path (middleware handles refresh before SSR)
  - `public/mocks/api/auth/login` and `public/mocks/api/auth/refresh` — updated JWT tokens signed with `JWT_SECRET=1234567890` for valid local `jose` verification
  - `.env.local` — updated `JWT_SECRET` and `BITRIX_INTERNAL_SECRET` to `1234567890`

### Added

- **Docker container** — multi-stage Dockerfile for production deployment on port 3028 (commit `[to-be-added]`)
  - `Dockerfile` — 3-stage build (deps → builder → runner) using `node:20-alpine`
  - `.dockerignore` — excludes `node_modules`, `.next`, `.git`, secrets from build context
  - `docker-compose.yml` — service `crm-frontend` with port mapping `3028:3028` and `.env.production`
  - `.env.production` — production environment config with `PORT=3028`, `NODE_ENV=production`
  - `next.config.ts` — added `output: "standalone"` for minimal production image
  - `README.md` — added Docker section with `docker compose` commands

### Added

- **Internationalization (i18n) system** — `next-intl` v4.12.0 integrated for all standard, non-customizable UI elements
  - `next.config.ts` — wrapped with `createNextIntlPlugin("./i18n/request.ts")`
  - `i18n/request.ts` — server-side request config with locale resolution (`LANGUAGE` env var)
  - `i18n/routing.ts` — locale routing config (`en`, `ru`; default from `LANGUAGE`)
  - `messages/en.json` — English dictionary (26 translation keys across 6 namespaces)
  - `messages/ru.json` — Russian dictionary (26 translation keys across 6 namespaces)
  - `src/app/layout.tsx` — wrapped in `NextIntlClientProvider` with `getLocale()`/`getMessages()`
  - `html lang` attribute now uses the resolved locale instead of hardcoded `"en"`
  - `.env` / `.env.example` — added `LANGUAGE=ru` for default locale
- **i18n integration in all standard UI components**:
  - `src/app/login/page.tsx` — all 6 user-facing strings → `useTranslations("login")`
  - `src/app/not-found.tsx` — "Страница не найдена" and "На главную" → `useTranslations("notFound")`
  - `src/engine/AppEngine.tsx` — "Page not found: {route}", "Data Feed Error", toast summaries (Error/Success/Info), "Confirmation" dialog header, "CRM Platform" default title → `useTranslations("app")`
  - `src/engine/DashboardHeader.tsx` — aria-labels (Menu, Profile, Login) → `useTranslations("app")`
  - `src/engine/ComponentRenderer.tsx` — fallback "[Component: {type} - Not implemented]" → `useTranslations("component")`
  - `src/engine/components/FiltersPanelComponent.tsx` — sidebar header, placeholders, apply/clear buttons, empty state → `useTranslations("filters")` via `t` prop
  - `src/engine/components/ActiveFiltersBarComponent.tsx` — "Clear all filters" tooltip → `useTranslations("filters")` via `t` prop
  - `src/engine/hooks/useDataFeedErrors.ts` — Toast "Data Feed Error" summary → `useTranslations("app")`
  - `src/auth/AuthContext.tsx` — "Login failed" error messages → `useTranslations("auth")`
  - `src/engine/components/types.ts` — `ComponentRendererProps` extended with optional `t` function
- **`LANGUAGE` env parameter** — controls default locale (added to `.env` and `.env.example`)

### Changed

- **Login page responsive layout** — `src/app/login/page.tsx`: form card full-width on mobile with `sm:max-w-30rem`, `sm:shadow-2`, `sm:border-round` breakpoint at 576px for centered card with shadow on larger screens
- **User menu now uses AuthContext** — `DashboardSidebar.tsx` displays `user.name` and `user.role` from `AuthContext` instead of hardcoded `userName`/`userRole` from `crm-config.json`; "Выйти" menu item triggers `logout()` deauthentication instead of navigation
- **UserMenuItem.action field** — new optional `action: "logout"` field in `src/types/app.ts` for menu items that should trigger actions instead of navigation
- **Auth API paths moved to .env** — `AUTH_LOGIN_URL`, `AUTH_LOGOUT_URL`, `AUTH_REFRESH_URL` now read from `process.env` (fallback: `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`) instead of being hardcoded throughout the auth system
  - `src/auth/constants.ts` — added `AUTH_LOGIN_URL`, `AUTH_LOGOUT_URL`, `AUTH_REFRESH_URL` exports
  - `src/auth/AuthContext.tsx` — uses `AUTH_LOGIN_URL`/`AUTH_LOGOUT_URL` for client-side fetch
  - `src/proxy.ts` — uses `AUTH_REFRESH_URL` for server-side token refresh
  - `src/app/api/auth/[...auth]/route.ts` — uses `AUTH_LOGIN_URL`/`AUTH_REFRESH_URL`/`AUTH_LOGOUT_URL` for Bitrix requests
  - `.env` / `.env.example` — added `AUTH_LOGIN_URL`, `AUTH_LOGOUT_URL`, `AUTH_REFRESH_URL` defaults

### Fixed

- **Memory leak: JWT secret regenerated on every request** — `tokenService.ts` now caches the encoded secret (`_jwtSecretCache`) instead of calling `new TextEncoder().encode(secret)` on every `verifyToken` call
- **Memory leak: Bitrix client env values regenerated** — `bitrixClient.ts` now caches `BITRIX_API_URL`, `BITRIX_INTERNAL_SECRET`, and `BITRIX_REQUEST_METHOD` in module-level variables instead of reading `process.env` on every request
- **Memory leak: constants recomputed on module import** — `constants.ts` now memoizes cookie name parsing into a single `_cookieArray` instead of splitting the same string 3 times
- **Memory leak: proxy making internal HTTP fetch for token refresh** — `proxy.ts` `tryRefreshToken()` now calls `bitrixRequest()` directly instead of `fetch('/api/auth/refresh')`, eliminating the request chain: request → proxy → fetch → /api/auth/refresh → bitrixClient → external API
- **Missing middleware entry point** — Next.js 16 requires the middleware file to be named `proxy.ts` with exported `proxy` function and `config` matcher; file was present but not wired correctly

### Added

- **Auth specification prompt** — `.prompts/auth.md` with a detailed plan for implementing JWT-based Bitrix24 authorization in NextJS App Router using httpOnly cookies, local JWT validation via `jose`, Auth Context for user state, and middleware-based route protection (commit `ad1656b`)
- **Auth system implementation** — full JWT-based Bitrix24 authorization (commit `d3bb21d`)
  - `src/types/auth.ts` — new types: User, AuthTokens, LoginResponse, LoginCredentials, TokenPayload
  - `src/auth/constants.ts` — cookie keys, token lifetimes, protected/guest routes
  - `src/auth/bitrixClient.ts` — HTTP клиент для 1С Битрикс с X-Internal-Secret
  - `src/auth/tokenService.ts` — JWT верификация/декодирование через jose
  - `src/auth/cookieService.ts` — установка/удаление httpOnly cookies
  - `src/auth/getServerUser.ts` — серверный хелпер для Server Components
  - `src/auth/AuthContext.tsx` — React Context (AuthProvider + useAuth)
  - `src/app/api/auth/[...auth]/route.ts` — Route handler для login/refresh/logout
  - `src/proxy.ts` — Proxy (бывш. middleware): проверка JWT, refresh, редиректы
  - `src/app/login/page.tsx` — страница логина с PrimeReact компонентами
  - `src/app/layout.tsx` — AuthProvider с initialUser с сервера
  - `src/engine/DashboardSidebar.tsx` — переключен на useAuth вместо пропсов
  - `src/engine/DashboardHeader.tsx` — переключен на useAuth вместо пропсов
  - `src/engine/AppEngine.tsx` — удалён isAuthenticated hardcode
  - `src/middleware.ts → src/proxy.ts` — миграция с middleware на proxy
  - `.env.example` — добавлены BITRIX_API_URL, BITRIX_INTERNAL_SECRET, JWT_SECRET
  - `README.md` — обновлена структура проекта и документация авторизации
- **Auth server error logging** — `bitrixClient.ts` теперь логирует ошибки в `console.error` (безопасно, в ответе клиенту — общее сообщение) (commit `[to-be-added]`)
  - Логи вызова: `[bitrixClient] → POST url`, `[bitrixClient] ✘ status — error`, `[bitrixClient] ✓ status`
  - `console.error` при отсутствии `BITRIX_API_URL` или `BITRIX_INTERNAL_SECRET`
  - `console.error` при HTTP-ошибке с расшифровкой из `error_description`
- **Mock API ответы для Bitrix auth** — 6 файлов в `public/mocks/api/bitrix/` (commit `[to-be-added]`)
  - `login-response-success.json` — успешный вход с access_token, refresh_token, user
  - `login-response-error.json` — ошибка "Неверный логин или пароль"
  - `refresh-response-success.json` — успешный refresh токенов
  - `refresh-response-error.json` — ошибка "Refresh токен недействителен или истёк"
  - `logout-response-success.json` — успешный выход
  - `logout-response-error.json` — ошибка "Токен недействителен"
- **Startup banner** — добавлена строка `Auth URL` с отображением `BITRIX_API_URL` из `.env` (commit `[to-be-added]`)

### Fixed

- **Main navbar active route detection** — sidebar menu items now stay highlighted for nested sub‑routes (e.g. `/users/123` keeps the "Участники" item active) (commit `[to-be-added]`)
  - Exact match for root route `/` to avoid highlighting Dashboard on every page
  - Route prefix match with `/` delimiter for all other routes to prevent false positives (e.g. `/users` does not match `/usersettings`)

### Added

- **Route pattern matching with [id]-style templates** — `findPageByRoute()` and `matchRoute()` in `src/core/config.ts` for matching dynamic routes like `/users/[id]` or `/users/[id]/edit` (commit `[to-be-added]`)
  - `matchRoute(actualRoute, routePattern)` — compares actual URL segments against a template with `[param]` placeholders
  - `findPageByRoute(route)` — tries exact match first, then pattern matching across all pages; returns `{ pageConfig, route, routeParams }`
  - `PageRouteMatch` and `RouteMatchResult` interfaces exported from `config.ts`
- **routeParams in ParsedLocation** — `src/utils/location.ts`: new `routeParams: Record<string, string>` field in `ParsedLocation`, populated both on server (`getServerLocation`) and client (`getClientLocation`) from `[id]` patterns in the page route
- **`{$location.routeParams.*}` macro** — `src/core/MacroEngine.ts`: new macro for accessing named route parameters, e.g. `{$location.routeParams.id}` resolves to `"123"` for URL `/users/123` with route `/users/[id]`
- **src/app/[[...slug]]/page.tsx** — fallback matching now uses `findPageByRoute` with full pattern support; `routeParams` passed to `getServerLocation`

### Changed

- **copyToClipboard command** — новая команда `copyToClipboard` для копирования данных в буфер обмена (commit `[to-be-added]`)
  - `CommandType` расширен типом `"copyToClipboard"`
  - `CommandExecutor.executeCopyToClipboard()` — использует `navigator.clipboard.writeText()` с fallback на `document.execCommand('copy')`
  - Поддержка макросов в `value`, `message`
  - Если `value` — объект, сериализуется в JSON (pretty-printed)
  - Опциональный параметр `message` для toast-уведомления при успехе
  - `docs/commands-reference.md` — добавлен раздел copyToClipboard

- **RulesEngine — rules support in sendRequest command** — новый модуль `RulesEngine` с функцией `applyRules()`, перенесён из `DataAdapterEngine.applyReplace()` (commit `[to-be-added]`)
  - `src/core/RulesEngine.ts` — функция `applyRules(data, rules)` для трансформации параметров запроса
  - Макрос `$value$` — подстановка исходного значения в шаблон
  - Рекурсивный обход данных: переименование ключей (через `name`) и замена значений (через `value`)
- **sendRequest rules parameter** — команда `sendRequest` теперь поддерживает опциональный параметр `rules` для трансформации `data` (commit `[to-be-added]`)
  - `executeSendRequest`: `data → macroEngine.apply → applyRules → format → execute`
  - Правила применяются после макро-резолвинга, что позволяет комбинировать `$value$` и `{{...}}` макросы
  - Пример: `rules: { "page": { "name": "offset", "value": "$value$" } }`

### Changed

- **DataAdapterEngine упрощён** — удалены функции `applyReplace`, `replaceValueMacro`, `replaceMacroInObject`; replace-адаптер теперь deprecated (commit `[to-be-added]`)
  - `replace` тип адаптера теперь только выводит предупреждение в консоль и возвращает данные без изменений
  - Для replace-трансформаций на сервере рекомендуется использовать JS-адаптеры
  - Клиентские replace-трансформации реализованы через `RulesEngine` в команде `sendRequest`

### Added

- **GET data as query params** — when `data` is provided but method is GET, the data is now serialized into URL query parameters instead of being silently dropped; `null`/`undefined` values are skipped (commit `[to-be-added]`)
  - `src/utils/http.ts` — new `buildUrlWithParams()` helper, `parseSearchParams()` reverse function
  - `src/core/DataFeedServerService.ts` — `executeServerDataFeeds` now converts data to query params for non-POST/PUT/PATCH methods
  - `src/core/DataFeedService.ts` — `executeRequest` same logic with a local `finalUrl` variable
  - `src/core/CommandExecutor.ts` — `executeDownloadFile` now uses `buildUrlWithParams` for GET data (commit `[to-be-added]`)
  - `src/app/api/[...route]/route.ts` — `handleRequest` now reads URL params for GET, parses them via `parseSearchParams` (with JSON.parse for encoded objects/arrays), passes them through the request adapter, and sends the adapted data back as URL params via `buildUrlWithParams`

### Added

- **downloadFile command** — новая команда `downloadFile` для скачивания файлов через API (commit `[to-be-added]`)
  - `CommandType` расширен типом `"downloadFile"`
  - `CommandExecutor.executeDownloadFile()` — fetch-запрос с бинарным ответом, создание Blob, программный клик для скачивания
  - Поддержка макросов в `url`, `data`, `filename`
  - Определение имени файла: параметр > Content-Disposition > последний сегмент URL
  - Параметры `onError` для обработки ошибок
- **API Router file route support** — `ApiRouteConfig.type?: "file"` для проксирования бинарных ответов (commit `[to-be-added]`)
  - `src/types/datafeed.ts` — добавлено поле `type` в `ApiRouteConfig`
  - `src/app/api/[...route]/route.ts` — при `type: "file"` возвращает ответ как `NextResponse(blob)` с `Content-Type`, `Content-Disposition`, `Content-Length`
  - `docs/commands-reference.md` — обновлен раздел downloadFile

- **sendRequest onSuccess/onError callbacks** — команды sendRequest теперь поддерживают коллбэки `onSuccess` (при успехе) и `onError` (при ошибке), доступны `{$event.result}` и `{$event.error}` в extraSources
- **Command Shortcuts** — named commands at page level, referenced by string ID in events `commands: ["shortcutId", {...}]`
  - `shortcuts?: Record<string, Command>` in Page type (`src/types/page.ts`)
  - `ComponentContext` extended with `shortcuts` prop, passed from `AppEngine`
  - `useComponentBindings` resolves string commands to full Command objects via `page.shortcuts`
  - `docs/commands-reference.md` updated with Shortcuts documentation
- **DataFeedAdapter with request/response support** — adapter can now be an object `{ request: "...", response: "..." }` in addition to a string
  - `src/types/dataFeed.ts` — new `DataFeedAdapter` interface, `DataFeedConfig.adapter` and `SendRequestParams.adapter` now support `string | DataFeedAdapter`
  - Request adapter applied **before** sending HTTP request (after macro resolution)
  - Response adapter applied **after** receiving HTTP response (as before)
  - `src/core/DataFeedServerService.ts` — extracted server-side data feed execution from `config.ts`, added `applyRequestAdapter()`, `setServerConfig()`
  - `src/core/DataFeedService.ts` — client-side `applyReplaceAdapter()` implementation with `applyReplaceRules()` for replace-style adapters, removed server-side `fs/promises` dependency
- **DataTable onSort handler** — `onSort` event now wired to handle lazy sorting
- **InputTextWithThrottle** — InputText with configurable `throttleDelay` (default 300ms), local state with debounced onChange
- **InputTextWithButton** — InputText with attached button using `p-inputgroup` style, `button` prop config with icon, label, severity, outlined, etc.
- **Components reference documentation** — `docs/components-reference.md` with full docs for all 40+ component types
- **FiltersPanel component** — metadata-driven filter drawer for list pages (based on PrimeReact Sidebar)
  - `src/types/filters.ts` — new types: `FilterItem`, `FilterModel`, `FilterType`
  - `src/engine/components/FiltersPanelComponent.tsx` — component with 10 filter types: checkbox, switch, range (multi-slider), slider, text, number, date, period (date range), options (checkbox group), radio (radio group)
  - Local state editing with "Apply" and "Clear" buttons in fixed footer
  - Integrated with Linkage system via `@state.filters` / `@state.filtersVisible` bindings
  - Example usage added to `config/pages/users.json`
- **ActiveFiltersBar component** — horizontal chip bar showing active filter selections
  - `src/engine/components/ActiveFiltersBarComponent.tsx` — renders chips for active filters; hidden when no filters selected
  - Chip label formatting per filter type: name-only for checkbox/switch, "name: value" for text/number/slider/radio, "name: from – to" for range/period, individual chips per option in options type
  - "Clear all" button on the left, each chip has removable button
  - Generates `onChange` event with updated filter model on removal
  - Integrated with Linkage system via `@state.filters`
  - Added to `config/pages/users.json` between filter drawer and table
- **Google Fonts fallback** — added `NEXT_PUBLIC_USE_SYSTEM_FONTS` env var; when set to `true`, skips Google Fonts fetch and uses system fonts (builds successfully without internet access)
  - `getGoogleFontVariables()` lazy-requires `next/font/google` and catches fetch errors gracefully
  - Added to `.env` as `NEXT_PUBLIC_USE_SYSTEM_FONTS=true`

### Changed

- **DataFeedServerService extracted from config.ts** — server-side data feed functions (`executeServerDataFeeds`, `resolveElementStateMacros`) moved to `src/core/DataFeedServerService.ts`, re-exported for backward compatibility
- **config.ts simplified** — removed ~160 lines of DataFeed functions, added `setServerConfig()` call in `initApp()`
- **Users page cleanup** — removed empty `state: {}` blocks, search switched to InputTextWithThrottle with 500ms delay, added onPage/onSort log events
- **Mock users data** — column widths converted to rem units, whitespace class fixed, added users-params.js adapter
- **Pages localized to Russian** — navigation bar, page titles, headers, placeholders, and 404 page translated
  - `config/crm-config.json` — sidebar label "Users" → "Участники"
  - `config/pages/users.json` — title, header, search placeholder, dropdown placeholder, switch label translated
  - `src/app/not-found.tsx` — "Page Not Found" → "Страница не найдена", "Go back to home" → "На главную"

### Refactored

- **Users page filters restructured** — removed separate actions block and Card wrapper; filters now flex row wrapping inline with Add User button inside filter area
- **ToggleComponents accept `className`** — `renderCheckbox`, `renderRadioButton`, `renderInputSwitch` now forward `className` to wrapper divs for better layout control
- **InputSwitch compact styling** — `min-w-max flex-grow-0` forced to prevent stretching in flex containers

### Fixed

- **404 page restyled** — converted `not-found.tsx` to Client Component to fix RSC `performance.measure()` negative timestamp error; restyled with PrimeReact `Button` and PrimeFlex centering to match app design (commit `[to-be-added]`)
- **bfcache disabled** — page now fully reloads when navigating back via browser buttons
  - Uses `performance.getEntriesByType('navigation')` to detect back/forward navigation (commits `d16f99e`, `7940e51`, `a7cdf84`)
  - Uses hidden `<img onload>` instead of `<script>` to avoid React script tag warning (commit `f0cdc81`)
  - Prevents broken styles and preloader hang issues when returning to the page
- **CommandExecutor refactored** — `eventData` replaced with `extraSources:` in all `execute*` methods (commit `324cb2c`)
  - `extraSources` built once in `executeCommand` via `createExtraSources(eventData)`, passed to all command methods
  - Eliminates duplicate calls to `createExtraSources()` inside each command
- **MacroEngine intercept fix** — removed generic `extraSources[prefix]` check that was intercepting standard macro prefixes (commit `2eb9990`)
  - Added dedicated `case "event"` for `{$event.*}` macro resolution
  - `resolveString` now merges `this.sources` with `extraSources` into a single `MacroSources` object
  - Ensures `{$location.query.*}` and `{$location.slug.*}` resolve correctly through standard switch-case
- **PageRenderer onLoad/onUnload missing `pageRoute` in CommandExecutor context** — `PageRenderer.tsx` now uses `useCommandExecutor` hook instead of manually creating `CommandExecutor` via `import("@/core")`, which lacked `pageRoute`. As a result `createExtraSources()` in `CommandExecutor` now correctly creates `extra.location` for onLoad/onUnload commands, enabling `{$location.*}` macros. (commit `[to-be-added]`)
  - `src/engine/hooks/useCommandExecutor.ts` — new hook that creates and caches `CommandExecutor` synchronously via `useMemo`
  - `src/engine/hooks/useComponentBindings.ts` — refactored to use `useCommandExecutor`, added public `executeCommands` function, removed unused `commandContextRef` and `elementIndex`
  - `src/engine/PageRenderer.tsx` — uses `useCommandExecutor` instead of dynamic `import("@/core")`, `pageRoute` now properly propagated
  - `src/core/index.ts` — exported `CommandExecutionContext` type
  - `src/core/CommandExecutor.ts` — `createMacroSources` now passes `appConfig?.config` (AppConfig) instead of the entire `App` object, matching the behavior in `DataFeedService`

- **Location missing in command macros** — added `getClientLocation(route)` call in `CommandExecutor.createExtraSources()` (commit `7ea1ab8`)
  - Client `location` now passed to `MacroEngine` on every command execution
  - Requires `pageRoute` propagation through `ComponentContext`, `ComponentProvider`, and `useComponentBindings`
- **`getClientLocation(route?)`** — `pathParams` now computed as segments AFTER the route prefix (commit `7ea1ab8`)

### Added

- **PathParam commands** — 4 new commands for path segment manipulation (commit `e294a51`):
  - `setPathParams` — replaces all path params: `{ values: ["val1", "val2"] }`
  - `mergePathParams` — updates path params by index: `{ values: { "2": "val2", "4": null } }`
  - `setPathParam` — sets/removes single param by index: `{ index: 1, value: "val2" }`
  - `removePathParam` — removes param by index: `{ index: 0 }`
  - Uses `pageRoute` to compute path segments after route, formats URL as `/{route}/{pathParams}?{search}`
- **`{$location.param.N}` macro** — new macro for accessing pathParams by index (commit `69fcc51`)
  - PathParams are segments after the page route (e.g., `/users/312/settings` with route `/users` → `param.0="312"`, `param.1="settings"`)
  - Updated `docs/macros-reference.md` with param documentation and corrected slug description (commit `69fcc51`)
- **9 comprehensive reference docs** in `docs/` (commits `0e8bb11`–`cbbea6d`):
  - `config-reference.md`, `macros-reference.md`, `linkage-reference.md`
  - `data-format-reference.md`, `commands-reference.md`
  - `api-router-reference.md`, `architecture-reference.md`
  - `data-feed-reference.md`, `data-adapter-reference.md`
- README compressed from 933 to 280 lines (commit `cbbea6d`)

---

## [1.0.0] — Documentation & Polish

### Added

- Comprehensive config-reference.md with App, Page, Section, Block, Component, Command specs (commit `0e8bb11`)
- macros-reference.md with 13 macro types and cross-platform support table (commit `8bf2abd`)
- linkage-reference.md — reactive `@...` binding system (commit `cdd19eb`)
- data-format-reference.md — 7 formatting types via Intl API (commit `73d6d69`)
- commands-reference.md — 17 command types with params (commit `97d2cbb`)
- api-router-reference.md, architecture-reference.md, data-feed-reference.md, data-adapter-reference.md (commit `784f3d4`)

---

## [0.9.0] — Routing, Navigation & 404

### Added

- **Fallback route matching** — segment-based page resolution with path parameters (commit `627c624`)
  - `{$location.slug.N}` macro for path segments after matched route
  - Path params support in server-side macro sources
- **404 page** — redirect on route not found (commits `19c2cbe`, `7bcac81`)
- **indexPageId** config — root route `/` maps to configured page ID (commit `4bddbc7`)
- Resolved route passed from server to AppEngine to prevent client-side mismatch (commit `f0f400a`)
- `p-ripple` class removed from sidebar items for performance (commit `95c3acd`)

---

## [0.8.0] — FormatEngine & URL Commands

### Added

- **FormatEngine** — data formatting with Intl API (commit `a8b0605`)
  - 7 types: Date, Time, Number, Currency, RelativeTime, List, Plural
  - 5 functions: DateTimeFormat, NumberFormat, RelativeTimeFormat, ListFormat, PluralRules
  - Fallback to `en-US` on error
  - Configurable locale from CRM config
- Format support integrated into all command types (commits `742868c`, `500c3c9`)
  - `setProperty`, `setState`, `mergeState` — format via `format` param
  - `sendRequest`, `showToast`, `navigate` — format support
  - Object and array property matching
- **URL parameter manipulation commands** (commits `ecddd70`, `fa3f7f8`):
  - `setUrlParams` — replace all params
  - `mergeUrlParams` — update/add params (preserves existing)
  - `setUrlParam` — change single param
  - `removeUrlParam` — delete param
- **refresh command** — page refresh without full reload (commit `bee62ec`)
  - Modes: `refresh` (router.refresh), `replace`, `reload`

### Refactored

- Command params renamed from `keys` to `values` for URL commands (commit `f29032f`)
- Format matching improved for nested objects in `applyFormatToValue` (commit `68c5ef5`)

### Fixed

- `mergeState` not notifying listeners properly (commit `ca622e5`)
- `parseTargetPath` treats `'state'` as page root state (commit `b37010f`)
- Dropdown auto-resolves value by `id` from options (commit `eabccce`)
- Allow object `source` in `setState` and `mergeState` commands (commit `d15e9d8`)

---

## [0.7.0] — Location Utilities & Server-Side Macros

### Added

- **Location utilities** — `getServerLocation()` and `ParsedLocation` type (commit `1bac07f`)
  - Server-side URL parsing with params and pathParams
  - Client-side `getClientLocation()` for browser context
- **Server-side macro resolution** for element states (commit `f833f50`)
  - `resolveElementStateMacros()` traverses page hierarchy and resolves macros in state
  - Macro sources include `config`, `env`, `location`
- URL parameter manipulation foundation (commit `5eb8cbf`)

### Refactored

- `executeServerDataFeeds` now accepts `serverSources` as parameter (commit `67d4a8a`)
- `resolveElementStateMacros` simplified to use sources directly (commit `025b96a`)

---

## [0.6.0] — ElementIndex Optimization & Component Architecture

### Added

- **React Context for cross-cutting params** (commit `e8558cf`)
  - `ComponentProvider` wraps render tree with context
  - Eliminates prop drilling for `showToast`, `navigate`, `confirm`, `appConfig`, etc.
- **`$event` macro support** — access event data in commands (commit `dce1999`)
- **TabView `renderActiveOnly` prop** — configurable tab rendering (commit `07513a1`)
- **Stats analytics data format** update with review mock data (commit `896b32d`)
- Section/block layout improvements and adapter updates (commit `985e6b9`)
- **Hidden FileUpload FOUC fix** — workaround for page transition flicker (commit `9fa612b`)
- **UserMenuSection** — collapsible user section for desktop sidebar (commits `98d362d`, `3cbf6a2`)

### Refactored

- ElementIndex created once at initApp — per-page index passed to AppEngine (commits `7e08e0f`, `beb4f3d`)
- Removed ElementIndex from Linkage and CommandExecutor (commit `7e08e0f`)
- TabView/Accordion converted to block-based format (commits `6608096`–`4949772`)
- `isMounted` removed from useComponentBindings (commit `f9a4476`)

### Fixed

- Sidebar user section flicker on page navigation (commit `98d362d`)
- Accordion `activeIndex` reactivity and TabView/Accordion props flow (commit `62a7ae4`)
- FOUC handling across initial load and page transitions (commit `2621f35`)

---

## [0.5.0] — Data Adapters & Nav Components

### Added

- **Data adapter system** — `DataAdapterEngine` (commit `f1fff7d`)
  - Replace adapter: dictionary-based property name/value replacement
  - JS adapter: custom `transform(data)` scripts from `public/adapters/`
  - `$value$` macro for value substitution in replace rules
  - Server-side only execution
- **Command event support** for Menubar, Breadcrumb, Steps (commits `6d49835`, `299cbd8`)
- **onNavigate event** for nav components with command merging (commit `ee7c8b3`)
- **`getServerEnv()` utility** — filtered NEXT*PUBLIC*\* environment variables (commits `3408c58`, `0cc375a`)

### Fixed

- Replace adapter recursion prevented from entering replacement values (commit `1ac9396`)
- `executeLog` handles non-string `resolvedMessage` (objects/arrays) (commit `001df56`)
- `analytics2menu.js` adapter updated to match actual analytics data structure (commits `1e690dc`, `608c097`)
- `useCommand` flag to avoid PrimeReact `command` prop conflict (commit `eccc385`)

---

## [0.4.0] — MacroEngine, Linkage & Full README

### Added

- **MacroEngine** with 24 macro types (commit `2f84c28`)
  - State, config, location, now, session/localStorage, cookie, window, math, device, browser, env
  - Server + client support where applicable
  - Recursive resolution with configurable max depth
- **Linkage system** — property-to-state bindings (commit `6529334`)
  - `@ELEMENT_ID.state.PATH` format
  - Reactive subscription via `Linkage.subscribe()`
  - `resolveDeep()` for recursive binding resolution
- **External API Data Feed** (commit `3253b4f`)
  - `dataFeed` config in pages for server-side data fetching
  - `sendRequest` command for client-side API calls
  - Macro substitution in URLs and data
  - Server-side execution in `page.tsx`
  - Error collection with Toast notifications
- **URL parameter commands** — `setUrlParams`, `setUrlParam`, `removeUrlParam` (commit `ecddd70`)
- **New state commands** — `clearState`, `toggleProperty` (commit `9503980`)
- **globalState removed** — state management simplified (commit `9503980`)
- README fully rewritten with platform capabilities (commit `e5d1d58`)

### Fixed

- Macro resolution in `apiRoutes` URLs (commits `cb59b67`, `c7ddba2`)

---

## [0.3.0] — Component Binding System & Performance

### Added

- **Component binding system** (commit `270e099`)
  - `valueBinding`, `visibleBinding`, `disabledBinding` properties
  - Link resolver for relative/absolute state references
  - Cross-component communication via shared state
- **Date utilities** — `src/utils/date.ts` (commit `270e099`)
  - `isIsoDateLike()`, `parseDateString()`, `isoToCustomFormat()`
  - Calendar supports ISO and custom date formats (`dd.mm.yyyy HH:mm`)
- **`setProperty` `value` parameter** — direct value without `source` (commit `9e98573`)
- **`log` command support** in CommandExecutor (commit `05b54c2`)
- **ElementIndex** — O(1) element lookups (commit `e25f919`)

### Performance

- **Filtered state subscriptions** (commit `eba0ddd`)
  - Components check if state change affects specific bindings before re-rendering
  - Eliminates unnecessary re-renders on every state change
  - Improves input field responsiveness during typing

### Refactored

- **ComponentRenderer modularization** (commit `56d271f`)
  - Monolithic ~850 lines → modular structure (~160 lines)
  - 16 separate component files grouped by type
  - Barrel export via `components/index.ts`
- **Event format unified** — `events` array replaces `onLoad`/`onChange` (commit `f8d14d5`)
- `parseTarget` moved to `PathResolver` (commit `73998f2`)

### Fixed

- `EventHandler.type` property (was incorrectly `event`) (commit `30e9c98`)
- `isMounted` changed from `useRef` to `useState` for Menubar/Chart (commit `8019e9a`)
- `setStateField` supports nested paths in `mergeState` (commit `6687556`)

---

## [0.2.0] — Statistics Page & Configuration Refactoring

### Added

- **Statistics page** with date filters and data export (commit `d107c62`)
  - Week selector dropdown (ascending order)
  - Date range picker (start/end dates)
  - Menubar download menu with tabs (Customers, Orders, Products)
- **Components showcase page** — 37 PrimeReact components demo (commits `0c20844`, `e37cdd8`)
- **Singleton config loader** — `initApp()` pattern with caching (commit `5bd0799`)
  - Loads config once per application lifetime
  - Prevents parallel loading during concurrent requests
- **nodemon auto-restart** on config file changes (commits `3049779`, `836f318`)

### Refactored

- Config split into separate page files with `$ref` references (commit `53afe30`)
- API endpoints split into separate `config/api/endpoints.json` (commit `d8aad05`)
- `[[...slug]]/page.tsx` converted to Server Component (commit `30b5a91`)

### Fixed

- Week sorting ascending, TabView tabs prop, Menubar iconDisplay (commits `576d12d`, `288702c`)
- Week dropdown: consistent object value format `{week, start, finish}` (commits `ab09d2b`, `595143f`)

---

## [0.1.0] — Initial Release

### Added

- Metadata-driven UI architecture (Blueprint + Engine pattern)
- Dynamic routing with `[[...slug]]` Next.js app router
- PrimeReact component integration (40+ components)
- Dark theme support (lara-dark-blue)
- State management — `StateManager` with `getState`, `setState`, `mergeState`, `subscribe`
- Command-based event handling — `CommandExecutor` with `setProperty`, `setState`, `sendRequest`, `showToast`, `navigate`, `confirm`, `sequence`, `delay`
- JSON-based configuration with `$ref` support via `@apidevtools/json-schema-ref-parser`
- PrimeFlex CSS utility system + PrimeIcons

### Pages

- **Dashboard** (`/`) — statistics cards, recent orders, activity timeline
- **Users** (`/users`) — users table, profile view, progress indicators
- **Orders** (`/orders`) — TabView with filterable orders, order creation form
- **Products** (`/products`) — product search, catalog cards, product table, edit form
- **Reports** (`/reports`) — date filters, charts (line/pie), skeleton placeholders
- **Settings** (`/settings`) — Steps wizard, profile, notifications, security, integrations, FAQ accordion

### UI Components

- **Sidebar** — PrimeReact Menu + Sidebar with desktop/mobile responsive layout
- **Header** — mobile header with burger menu, user avatar dropdown
- **User Menu** — profile link, logout with SplitButton on desktop
- **GlobalPreloader** — prevents FOUC during page load
- **DashboardSidebar** — navigation icons, collapsible user section, active route highlighting

### Infrastructure

- Path alias `@/` → `./src/*`
- ESLint configuration
- TypeScript strict mode
- Dev server with `next dev --turbo`
