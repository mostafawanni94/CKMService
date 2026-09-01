# CKM Services — Employee App

Flutter mobile app for CKM Services employees.

> **Note the directory name.** This folder is called `FlutterProTotaalService`
> but it is the **employee** app (`pubspec name: pro_totaal_service`). The
> customer portal lives in `FlutterEmployeeProject/`. A rebrand renamed the
> product but not the folders.

Part of a larger platform — see the [root README](../README.md).

## Running it

The API base URL is supplied at build time; there is deliberately no default in
a release build.

```bash
flutter pub get

flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api    # Android emulator
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:8000/api   # iOS simulator
flutter run --dart-define=API_BASE_URL=http://192.168.1.50:8000/api  # physical device

flutter build apk --dart-define=API_BASE_URL=https://api.ckmservices.nl/api
```

Omitting `API_BASE_URL` in debug falls back to a per-platform localhost address;
omitting it in a **release** build throws at startup, on purpose.

```bash
flutter analyze
flutter test
```

## What an employee can do

- Complete their profile on first login and submit it for approval
- See assignments — **location and time only**, never the customer or the
  commercial detail behind the job
- Acknowledge shifts, fill in actual times and breaks, attach photos, submit
- Track worklog status and pending earnings
- View wallet balance and request advances
- View payslips and request leave
- Receive push notifications

English, Arabic (RTL) and Russian.

## Layout

```
lib/
├── main.dart
├── core/
│   ├── config/api_config.dart     build-time base URL
│   ├── network/api_client.dart    HTTP + automatic token refresh
│   ├── storage/secure_storage.dart
│   ├── services/fcm_service.dart  push notifications
│   ├── localization/ · widgets/ · utils/
└── features/                      auth · profile · home · assignments · shifts
                                   worklogs · wallet · invoices · notifications
```

Each feature follows `data/` (services and models) → `presentation/viewmodels/`
(Provider `ChangeNotifier`) → `presentation/screens/`.

## Networking

`ApiClient` attaches the bearer token, and on a 401 refreshes once and retries.
Concurrent 401s share a single refresh — the server rotates refresh tokens and
blacklists the old one, so parallel refreshes would invalidate each other.

When the session cannot be renewed, `ApiClient.onSessionExpired` fires and
`AuthViewModel` returns the user to the login screen.

## Push notifications

`FcmService` uses FCM **HTTP v1**. It needs:

- `android/app/google-services.json`
- `ios/Runner/GoogleService-Info.plist`
- A Firebase project id and service-account JSON under dashboard Settings

Without them `initialize()` logs and no-ops — the app runs normally, just
without push. Device tokens register **after** login, since the endpoint is
authenticated and binds the token to the signed-in user.
