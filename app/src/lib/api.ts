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
  const isForm = body instanceof FormData;
  const headers: Record<string, string> = {};
  // fetch sets the multipart boundary for FormData; do not set it manually.
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (token) {
    headers.Authorization = 'Bearer ' + token;
  }

  // Photos need more time to upload than a small JSON request.
  const controller = new AbortController();// helper to abort web requests as ur needs
  const timeout = setTimeout(() => controller.abort(), isForm ? 60000 : 12000);

  try {
    const response = await fetch(API_URL + path, {
      method,
      headers,
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    // Express can return an HTML error page if multipart parsing fails.
    // Keep that separate from a connection failure.
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        ok: false,
        status: response.status,
        data: { message: `Backend returned an unreadable response (HTTP ${response.status}). Check the backend terminal.` },
      };
    }
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error('API request failed:', method, path, error);
    if (controller.signal.aborted) {
      throw new Error(isForm
        ? 'The photo upload timed out. Check your entries before retrying, as the loan may have saved.'
        : 'The request timed out. Check that the backend is running.');
    }
    if (isForm) {
      throw new Error('Could not upload this photo. Please reattach it and try again. See the Expo terminal for details.');
    }
    throw new Error('Could not reach MiniLedger. Check your Wi-Fi and that the backend is running.');
  } finally {
    clearTimeout(timeout);
  }
}
