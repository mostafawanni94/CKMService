# CKM Services — Customer Portal

Flutter mobile app that lets CKM Services customers follow progress on their own
projects.

> **Note the directory name.** This folder is called `FlutterEmployeeProject`
> but it is the **customer portal** (`pubspec name: ckm_customer_portal`). The
> employee app lives in `FlutterProTotaalService/`. A rebrand renamed the
> product but not the folders.

Part of a larger platform — see the [root README](../README.md).

## Running it

```bash
flutter pub get

flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api    # Android emulator
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:8000/api   # iOS simulator

flutter build apk --dart-define=API_BASE_URL=https://api.ckmservices.nl/api
```

Omitting `API_BASE_URL` in debug falls back to a per-platform localhost address;
omitting it in a **release** build throws at startup, on purpose.

```bash
flutter analyze
flutter test
```

## What a customer can do

Read-only, scoped strictly to their own company:

- Browse their projects and see progress
- Open a project's work entries, day by day
- View a project calendar
- See the photos employees attached to the work
- Export a project's hours to Excel

## Layout

```
lib/
├── main.dart                      login gate + bottom-tab shell
├── core/
│   ├── config/api_config.dart     build-time base URL
│   ├── network/api_client.dart    HTTP + automatic token refresh
│   ├── theme/ · widgets/
└── features/
    ├── auth/                      login, session state
    ├── projects/                  dashboard, detail, work entries
    └── profile/
```

## API

Everything goes through `/api/customer-portal/`, which the backend scopes to the
signed-in user's linked `Customer`. A portal account with no customer attached
is rejected outright.

```
GET /api/customer-portal/profile/
GET /api/customer-portal/projects/
GET /api/customer-portal/projects/<id>/{,entries,calendar,export}
GET /api/customer-portal/entries/<id>/
```

`ApiClient` refreshes the access token on a 401 and stores the rotated refresh
token; when renewal fails, `AuthService` returns the user to the login screen.
