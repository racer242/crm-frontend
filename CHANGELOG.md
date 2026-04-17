# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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

### Date Utilities

- Created `src/utils/date.ts` with date parsing utilities:
  - `isIsoDateLike()` — check ISO date format
  - `parseDateString()` — parse custom formats (dd.mm.yyyy HH:mm)
  - `isoToCustomFormat()` — convert ISO to custom format
- Support for multiple date formats in Calendar component:
  - ISO: `2026-04-13T23:30:00`
  - Custom: `13.04.2026 23:30`, `13.04.2026`

### Changed

- API configuration split: endpoints moved to separate `config/api/endpoints.json` file
- Week dropdown format: consistent object value structure `{week, start, finish}`

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
