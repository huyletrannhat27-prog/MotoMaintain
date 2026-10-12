# MotoMaintain mobile

Ứng dụng Expo SDK 57 / React Native, điều hướng bằng Expo Router trong `src/app/`.

Chạy `npm ci` rồi `npm start`; xem hướng dẫn cấu hình Supabase, xác thực email/deep link, kiểm thử và build APK trong [README chung](../README.md).

Không có cấu hình Supabase: app dùng dữ liệu demo lưu trên thiết bị, có nhãn rõ. Có cấu hình: dùng tài khoản và dữ liệu chung với web. Mã tính bảo dưỡng nằm trong `../shared/` và được Metro theo dõi qua `metro.config.js`.

Kiểm tra: `npm run lint`, `npm run typecheck`, `npx expo-doctor`.
