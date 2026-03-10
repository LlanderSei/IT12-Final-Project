# Desktop Runtime Placeholders

Phase 4 currently scaffolds the Electron desktop environment and expects bundled runtimes to be placed here for production packaging.

## Expected layout

- `desktop/runtime/php/`
  - Windows example: `php.exe`
- `desktop/runtime/mysql/bin/`
  - Windows example: `mysqld.exe`

## Packaged layout

Electron packaging copies this folder to:
- `resources/runtime/`

The desktop launcher will use:
- `desktop/runtime` during development
- `resources/runtime` when packaged

## Bundling helper

Use the helper script to copy local runtimes into this folder before packaging:

```powershell
.\desktop\scripts\bundle-runtime.ps1 -PhpRoot "C:\path\to\php" -MysqlRoot "C:\path\to\mysql"
```

Expected input roots:
- `PhpRoot` should contain `php.exe`
- `MysqlRoot` should contain `bin\mysqld.exe`

## Development fallback

If these binaries are not present, the Electron scaffold falls back to executables available on `PATH`:

- `php`
- `mysqld` when `DESKTOP_MANAGED_MYSQL=true`

## Current status

The repository does not yet ship PHP or MySQL binaries. These directories exist so packaging work can target a stable structure without guessing paths.
