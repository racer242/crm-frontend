# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Statistics page with date filters and data export functionality
  - Week selector dropdown (ascending order)
  - Date range picker (start/end dates)
  - Menubar download menu with tabs for Customers, Orders, Products tables

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
