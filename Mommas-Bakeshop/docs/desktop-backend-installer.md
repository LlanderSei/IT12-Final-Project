# Desktop Backend Installer Flow (Windows)

This flow installs a local Laravel backend (PHP + MySQL) and configures the desktop app to connect to `http://127.0.0.1:<port>`.

## Target Layout

```
C:\Program Files\Mommas-Bakeshop\backend\
  app\                     (Laravel app + vendor)
  php\                     (portable PHP runtime)
  mysql\                   (portable MySQL runtime)
  mysql-data\              (MySQL data dir)
```

Desktop config:
```
%APPDATA%\Momma's Bakeshop\desktop-config.json
```

## Script Usage

### 1) Install backend (copy, init DB, migrate/seed, write config)
```powershell
.\desktop\scripts\install-backend.ps1 `
  -AppRoot "E:\path\to\laravel-app" `
  -PhpRoot "E:\path\to\php" `
  -MysqlRoot "E:\path\to\mysql" `
  -InstallRoot "C:\Program Files\Mommas-Bakeshop\backend" `
  -Port 8123 `
  -DbName "mommas_bakeshop" `
  -DbUser "mommas" `
  -DbPass "mommas_password"
```

### 2) Install services (optional, requires NSSM)
```powershell
.\desktop\scripts\install-backend.ps1 `
  -AppRoot "E:\path\to\laravel-app" `
  -PhpRoot "E:\path\to\php" `
  -MysqlRoot "E:\path\to\mysql" `
  -NssmPath "C:\tools\nssm.exe"
```

## Notes

- The installer uses MySQL on port `3307` to avoid collisions with system MySQL.
- The desktop app will read `%APPDATA%\Momma's Bakeshop\desktop-config.json` and use `DESKTOP_APP_URL`.
- Service installation uses NSSM for reliability with non-service executables.

## Next Steps

- Replace plain-text DB credentials with a secure generation step.
- Add health endpoint or set `DESKTOP_SKIP_HEALTH_CHECK=true` for local use.
