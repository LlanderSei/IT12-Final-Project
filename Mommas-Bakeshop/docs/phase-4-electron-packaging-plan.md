# Phase 4 Electron Packaging Plan

## Scope
Turn the Laravel + Vite + local MySQL application into a locally runnable desktop package without changing the application data model.

## Chosen runtime model
- Desktop shell: Electron
- Backend: bundled PHP runtime serving Laravel locally on `127.0.0.1`
- Frontend: prebuilt Vite assets
- Database: bundled local MySQL or MariaDB service
- Backup strategy: reuse the existing snapshot, incremental, verify, restore, retention, schema report, and local-to-remote transfer tools already implemented in the app

## Packaging objectives
1. End users do not install PHP, Composer, Node, or MySQL manually.
2. First launch is guided and deterministic.
3. The packaged app can recover from local DB issues using the built-in backup tooling.
4. The packaged app only binds to localhost.

## Desktop bundle contents
- Electron application
- Compiled frontend assets from `npm run build`
- Laravel application source
- `vendor/` directory already installed
- Bundled PHP runtime
- Bundled MySQL or MariaDB runtime
- Writable directories for:
  - `storage/`
  - backup files
  - logs
  - local database data directory

## First-run bootstrap flow
1. Create writable application data directories.
2. Write `.env` from a packaged template.
3. Generate app key.
4. Start local MySQL or MariaDB service.
5. Create the local application database if missing.
6. Run migrations.
7. Run required seeders.
8. Create storage symlink or desktop-safe public asset mapping.
9. Launch Laravel and open Electron shell.
10. If no owner user exists, open a first-run owner setup wizard.

## Runtime process model
- Electron starts a local process manager.
- Process manager starts:
  - MySQL or MariaDB
  - Laravel HTTP runtime
- Electron waits for a local health endpoint.
- UI loads only after health check passes.
- Shutdown stops Laravel cleanly, then stops DB process.

## Required packaging work
### Application side
- Add a lightweight health-check route for desktop boot readiness.
- Add first-run setup detection.
- Add a desktop-safe log and crash summary surface.

### Build side
- Create Electron workspace with development and production launch scripts.
- Copy built frontend assets and Laravel app into the packaged distribution.
- Package PHP runtime binaries by target OS.
- Package MySQL or MariaDB binaries and initialize a local data directory on first launch.

### Operational safeguards
- Force localhost-only binding.
- Prevent multiple simultaneous desktop instances using the same DB directory.
- Expose backup status and restore entry points clearly from the Database page.
- Keep remote switching optional and manual.

## Risks
1. Bundled MySQL increases installer size and startup complexity.
2. Antivirus and firewall tooling may flag a self-hosted local server stack.
3. Windows service management is heavier if DB is installed as a service instead of a child process.
4. Trigger-heavy imports and restores must keep the current safety protections.

## Recommended implementation sequence
1. Add desktop health endpoint and first-run readiness checks.
2. Create Electron shell with local Laravel launcher.
3. Add child-process management for PHP and local MySQL.
4. Add production packaging scripts.
5. Test clean install, update, backup, restore, and crash recovery on a disposable machine.

## Deferred until Phase 4 execution
- auto-update strategy
- installer UX
- desktop notifications
- OS-specific tray/menu behavior

## Phase 4 progress
Implemented:
- localhost-only desktop health endpoint at `/desktop/health`
- Electron main process scaffold with single-instance guard
- Laravel child-process launcher
- optional managed MySQL child-process scaffold
- desktop bootstrap command `php artisan desktop:bootstrap --force`
- Electron packaging scripts in `package.json`

Current assumptions:
- development can fall back to `php` and `mysqld` on PATH
- packaged PHP and MySQL binaries are not bundled yet
- managed MySQL stays opt-in through `DESKTOP_MANAGED_MYSQL=true`

Next packaging tasks:
1. Bundle Windows PHP runtime under `desktop/runtime/php/`
2. Bundle Windows MySQL/MariaDB runtime under `desktop/runtime/mysql/`
3. Add first-run desktop owner setup UI when `/desktop/health` reports `firstRunRequired=true`
4. Run a real `electron-builder` packaging pass on a disposable machine and trim the distribution payload
