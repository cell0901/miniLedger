import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Prefer the Windows Wi-Fi URL from .env.local.
// Otherwise try the computer running Expo (useful for same-Wi-Fi development).
const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || `http://${expoHost || defaultHost}:3000/api`
).replace(/\/$/, '');

// Example: api('/loans', 'POST', { friendName, amount, dueDate }, session.token)
// Each screen checks result.ok and decides what to do with result.data.
export async function api(path: string, method = 'GET', body?: object, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = 'Bearer ' + token;
  }

  // Stop waiting after 12 seconds if the computer cannot be reached.
  const controller = new AbortController();// helper to abort web requests as ur needs
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(API_URL + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch {
    throw new Error('Could not reach MiniLedger. Check your Wi-Fi and that the backend is running.');
  } finally {
    clearTimeout(timeout);
  }
}
