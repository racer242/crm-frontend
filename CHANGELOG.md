# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed

- **bfcache disabled** — page now fully reloads when navigating back via browser buttons
  - Added `pageshow` event listener in layout that triggers `window.location.reload()` when page is restored from bfcache (`e.persisted === true`)
  - Prevents broken styles and preloader hang issues when returning to the page

### Added

- **External API Data Feed** — server-side and client-side data fetching with macro resolution
  - `dataFeed` configuration in page configs defines API requests at page load
  - `sendRequest` command for client-side API calls from events (onLoad, onClick, etc.)
  - Macro substitution `{$ELEMENT_ID.state.PATH.TO.FIELD}` and `{$config.*}` in URLs and data
  - Server-side execution in `page.tsx` — data fetched before HTML is sent to client
  - Successful results merged into element state (preserves existing fields)
  - Error handling with Toast notifications for failed requests
  - Client-side navigation support — dataFeed re-applied on page transitions

### Refactored

- **ComponentRenderer modularization** — split monolithic `ComponentRenderer.tsx` (~850 lines) into modular structure (~160 lines)
  - Extracted `useComponentBindings` hook for binding logic and state subscription
  - Split component renderers into 16 separate files grouped by type:
    - `TextComponent` — Text: H1, H2, H3, P
    - `InputComponents` — InputText, InputNumber, InputTextarea, Password
    - `SelectComponents` — Dropdown, MultiSelect, AutoComplete, Calendar
    - `ToggleComponents` — Checkbox, RadioButton, InputSwitch, Slider, Rating
    - `MiscInputComponents` — ColorPicker, FileUpload
    - `ButtonComponent` — Button
    - `DataTableComponent` — DataTable
    - `CardComponent` — Card
    - `ToastComponent` — Toast
    - `NavComponents` — Menubar, Breadcrumb, Steps
    - `ContainerComponents` — TabView, Accordion, Carousel
    - `DisplayComponents` — Skeleton, Chip, Avatar, Badge, Tag
    - `ProgressComponents` — ProgressBar, ProgressSpinner
    - `FeedbackComponents` — Message, Divider, Timeline
    - `ChartComponent` — Chart
  - Barrel export via `components/index.ts`
  - Type definitions moved to `components/types.ts`

### Added

- Statistics page with date filters and data export functionality
  - Week selector dropdown (ascending order)
  - Date range picker (start/end dates)
  - Menubar download menu with tabs for Customers, Orders, Products tables

### Component Binding System

- Data binding support via `valueBinding`, `visibleBinding`, `disabledBinding` properties
- Command-based event handling: `setProperty` command to update state from components
- Link resolver for relative (`@ELEMENT_ID.state.FIELD`) and absolute (`@state.field`) references
- Cross-component communication through shared application state

### State Management

- StateManager constructor accepts `initialDataFeed` for server-side data preloading
- Successful dataFeed results are merged into state (not replaced) preserving existing fields
- `setStateField(elementPath, field, value)` — set nested state fields with dot notation
  - Example: `setStateField("statistics", "textData.input", "hello")` → `{ textData: { input: "hello" } }`
  - Uses `PathResolver.setValue` for proper nested path support
- `StateChangeListener` now receives `changedPath` parameter for filtering updates
  - `changedPath: string | null` — path of the changed field (null for full state replacement)
  - Enables components to subscribe only to relevant state changes

### Performance Optimizations

- Filtered state subscriptions in `ComponentRenderer`
  - Components now check if a state change affects their specific bindings before re-rendering
  - Eliminates unnecessary re-renders on every state change
  - Improves input field responsiveness (no lag during typing)
  - Binding path comparison handles multiple formats:
    - `@state.field` — short form (relative to current page)
    - `@pageId.state.field` — full form with page ID
    - `@componentId.prop` — cross-component references

### Date Utilities

- Created `src/utils/date.ts` with date parsing utilities:
  - `isIsoDateLike()` — check ISO date format
  - `parseDateString()` — parse custom formats (dd.mm.yyyy HH:mm)
  - `isoToCustomFormat()` — convert ISO to custom format
- Support for multiple date formats in Calendar component:
  - ISO: `2026-04-13T23:30:00`
  - Custom: `13.04.2026 23:30`, `13.04.2026`

### Component Fixes

- Fixed `EventHandler.type` property (was incorrectly named `event`)
- Fixed `isMounted` for Menubar/Chart: changed from `useRef` to `useState`
  - `useRef` doesn't trigger re-render, causing components to show skeleton placeholders forever
  - `useState` properly triggers re-render after hydration, fixing SSR hydration mismatch

### Changed

- API configuration split: endpoints moved to separate `config/api/endpoints.json` file
- Week dropdown format: consistent object value structure `{week, start, finish}`
- `CommandExecutor.setProperty` now uses `setStateField` instead of `mergeState`
  - Properly handles nested paths like `textData.input`

---

## [0.1.0] - Initial Release

### Added

- Metadata-driven UI architecture (Blueprint + Engine pattern)
- Dynamic routing with `[[...slug]]` Next.js app router
- Configurable navbar with icons and routes
- Global state management system
- Command-based event handling
- PrimeReact component integration (40+ components)
- Dark theme support (lara-dark-blue)
- Mock authentication and user data

### Pages

- Dashboard — statistics cards, recent orders, activity timeline
- Users — users table, profile view, progress indicators
- Orders — TabView with filterable orders, order creation form
- Products — product search, catalog cards, product table, edit form
- Reports — date filters, charts (line/pie), skeleton placeholders
- Settings — Steps wizard, profile, notifications, security, integrations, FAQ accordion

### Configuration

- JSON-based configuration with `$ref` support
- Modular config files (pages, API endpoints)

### Data Feed

- `dataFeed` section in page configuration for server-side API data fetching
- `sendRequest` command for client-side API requests
- Macro support: `{$config.baseURL}`, `{$ELEMENT_ID.state.field}`
- Target addressing: `"target": "state"`, `"target": "elementId.state.field"`
- Error handling via Toast notifications
