# Pro Totaal Service - Employee Mobile App

A Flutter mobile application for employees of Pro Totaal Service.

## Tech Stack

- **Framework**: Flutter 3.x
- **Language**: Dart
- **State Management**: Provider
- **API Integration**: REST API to Django Backend
- **Authentication**: Token-based (JWT)

## Prerequisites

Before you begin, ensure you have Flutter installed:

### Install Flutter (macOS)

```bash
# Using Homebrew
brew install flutter

# Or download from https://flutter.dev/docs/get-started/install/macos
```

### Verify Installation

```bash
flutter doctor
```

## Getting Started

### 1. Initialize Flutter Project

Since Flutter SDK wasn't installed during scaffolding, run:

```bash
# Create a new Flutter project in this directory
flutter create . --org com.prototaalservice

# Get dependencies
flutter pub get
```

### 2. Configure API Endpoint

Edit `lib/config/app_config.dart` with your backend URL.

### 3. Run the App

```bash
# For iOS
flutter run -d ios

# For Android
flutter run -d android
```

## Project Structure

```
lib/
├── main.dart                 # App entry point
├── config/                   # Configuration
│   ├── app_config.dart      # API URLs, constants
│   └── theme.dart           # App theme
├── models/                   # Data models
│   ├── user.dart
│   ├── employee.dart
│   ├── project.dart
│   ├── work_log.dart
│   └── wallet.dart
├── providers/                # State management
│   ├── auth_provider.dart
│   ├── employee_provider.dart
│   └── wallet_provider.dart
├── screens/                  # UI screens
│   ├── auth/                # Login screens
│   ├── onboarding/          # Profile completion
│   ├── home/                # Main dashboard
│   ├── assignments/         # Project assignments
│   ├── worklogs/            # Time tracking
│   ├── wallet/              # Wallet & advances
│   └── notifications/       # Notification center
├── services/                 # API services
│   ├── api_service.dart     # HTTP client
│   ├── auth_service.dart    # Authentication
│   └── storage_service.dart # Local storage
├── widgets/                  # Reusable widgets
│   ├── buttons/
│   ├── cards/
│   ├── forms/
│   └── dialogs/
└── utils/                    # Utilities
    ├── validators.dart
    ├── formatters.dart
    └── helpers.dart
```

## Features

### Employee Features

- [ ] Login with admin-provided credentials
- [ ] Complete profile (mandatory fields)
- [ ] Upload ID documents (front + back)
- [ ] Upload certificates (VCA, etc.)
- [ ] View project assignments
- [ ] Submit work logs (time tracking)
- [ ] View wallet balance
- [ ] Request advances
- [ ] Receive notifications

### Technical Features

- [ ] Offline support
- [ ] Push notifications
- [ ] Camera integration (document upload)
- [ ] Biometric authentication
- [ ] Dark mode support

## API Integration

The app connects to the Django backend at:
- Development: `http://localhost:8000/api`
- Production: `https://api.prototaalservice.nl/api`

## Building for Production

### Android

```bash
flutter build apk --release
# or for app bundle
flutter build appbundle --release
```

### iOS

```bash
flutter build ios --release
```

## Support

For technical support, contact the development team.
