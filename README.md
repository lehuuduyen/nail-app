# nail-app

React Native **Expo** POS + admin UI for the nail salon stack (Nail Solution style).

## Setup

```bash
cd nail-app
cp .env.example .env
# Edit EXPO_PUBLIC_API_URL to your machine IP + backend port
npm install
# If npm reports peer dependency conflicts, use: npm install --legacy-peer-deps
npx expo start
```

This SDK 55 project expects **`react-native-worklets`** (for Reanimated 4’s Babel plugin) and **`babel-preset-expo`** as a dev dependency; they are already listed in `package.json` after `expo install` / `npm install`.

If Metro fails with **Unable to resolve `react-dom/client`** from `@expo/log-box`, install the matching **`react-dom`** (same minor as `react`): `npx expo install react-dom`.

Scan the QR code with **Expo Go** (same major SDK as this project).

## Environment

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | Base URL for `nail-backend` (no trailing `/api`) |
| `EXPO_PUBLIC_ADMIN_PIN` | 4–6 digit PIN for `/ (admin)` routes (optional; default in app is `123456` if unset) |

## Same Wi‑Fi as `nail-backend`

1. Start the API with host listening on all interfaces (this repo’s server uses `0.0.0.0`).
2. On your Mac, find your LAN IP: **System Settings → Network** or `ipconfig getifaddr en0`.
3. Set `EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:PORT` (often `5001` if `5000` is taken by AirPlay).
4. Reload the app (shake device → Reload, or restart Metro).

**Android emulator:** use `http://10.0.2.2:5001` instead of `localhost`.

**iOS simulator:** `http://127.0.0.1:PORT` usually works.

## Builds (APK / TestFlight)

Use [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npm i -g eas-cli
eas login
eas build:configure
# Android store / sideload
eas build -p android --profile production
# iOS (requires Apple Developer account)
eas build -p ios --profile production
```

For **TestFlight**, submit the iOS build with `eas submit -p ios`. For a quick **Android APK**, use an `eas.json` profile with `buildType: "apk"`.

## Project layout

- `../shared/employeesSeed.json` — cùng nguồn với backend seed + fallback offline (Metro `watchFolders` gồm thư mục repo).
- `app/` — Expo Router (`(pos)`, `(admin)`, `(auth)`)
- `components/` — shared UI (payment modal, admin PIN gate, etc.)
- `api/client.js` — Axios instance + JWT from AsyncStorage (`local-demo` token skips `Authorization`)
- `store/` — Zustand (`authStore`, `posStore`, `localCatalogStore` for offline-added staff/services)

## Thêm nhân viên & dịch vụ

- **POS (sidebar):** nút **Thêm nhân viên** / **Thêm dịch vụ** → màn `/(pos)/add-employee` và `/(pos)/add-service` (cùng PIN admin mỗi lần vào màn).
- **Đã đăng nhập API:** lưu qua `POST /api/employees` và `POST /api/services`.
- **Offline / “Continue offline”:** lưu vào AsyncStorage; bubble POS và danh sách dịch vụ New Ticket gộp thêm các mục này.
- **Admin (PIN):** `/(admin)/employees` và `/(admin)/services` — quản lý đầy đủ (xoá, v.v.).
- **Lịch hẹn:** `/(pos)/appointments` — `GET /api/appointments/day?date=YYYY-MM-DD` + nhân viên từ API; ô màu theo trạng thái (scheduled / in_progress / completed).
- **Check turns:** `/(pos)/checkin` hoặc nút CHECK TURNS trên POS — cùng API ngày; **Đã đến** → `in_progress`, **Hoàn thành** → `completed` (cần đăng nhập API, không dùng offline-only).

## Login

- **API:** use a real user from `nail-backend` (e.g. `admin` / `admin123` after `npm run reset-admin`).
- **Offline:** “Continue offline” uses sample staff/services and skips Bearer auth.
