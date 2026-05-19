# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **Auth specification prompt** — `.prompts/auth.md` with a detailed plan for implementing JWT-based Bitrix24 authorization in NextJS App Router using httpOnly cookies, local JWT validation via `jose`, Auth Context for user state, and middleware-based route protection (commit `ad1656b`)
- **Auth system implementation** — full JWT-based Bitrix24 authorization (commit `[to-be-added]`)
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
