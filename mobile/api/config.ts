// Set this to your computer's LAN address in mobile/.env for Expo Go.
// Example: EXPO_PUBLIC_API_BASE_URL=http://192.168.1.25:5000
export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '') ?? '';
