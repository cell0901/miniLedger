# MiniLedger app

An Expo Go app for money lent to friends. The UI follows the Wise-inspired `design.md`: sage canvas, lime-green actions, heavy display headings, white cards, and 24 px card/button radii. The proprietary display font is represented with the native system font at weight 900; no remote fonts or extra dependencies are required.

## Screens

- **Login** (`src/app/login.tsx`): phone number, mock OTP verification, resend, and change number.
- **Ledger** (`src/app/index.tsx`): summary, loan list, pending/overdue/repaid filters, pull to refresh, and confirmed repayment.
- **Add loan** (`src/app/add-loan.tsx`): friend name, amount, due date, date shortcuts, and an optional receipt photo.

All three screens handle iPhone safe areas. Forms handle the keyboard, loading, errors, and basic input validation. Choose a receipt from the photo library, preview or remove it before saving, and open it later from its loan entry. Receipts support JPEG, PNG and WebP up to 5 MB.

## How the code works

There is no context provider or custom ledger hook. Each screen uses ordinary React state and event handlers:

1. `login.tsx` keeps the phone, OTP, loading, and error in `useState`. `sendOtp()` requests a code; `verify()` saves the returned token and opens home.
2. `lib/session.ts` is a plain object containing the token and phone. Screens import the same object. It holds login details only; it does not trigger React renders. Navigation opens the next screen after login or sign-out.
3. `index.tsx` owns the `loans`, `summary`, `loading`, and `error` state. `loadLedger()` fetches loans and totals and calls the state setters. `repay()` updates a loan, then reloads that data.
4. `add-loan.tsx` owns its form state. `save()` validates the inputs, sends the loan, and goes back.
5. Home uses Expo Router's `useFocusEffect` to load data when it becomes visible, including after adding a loan. Think of it as `useEffect` for screen visits. `useCallback` keeps that listener stable between renders.
6. `lib/api.ts` is a small `fetch` wrapper: it sends JSON or `FormData` and the optional token, then returns `{ ok, status, data }`. Photos use `FormData`, so `fetch` sets the multipart content type automatically. Screens check `ok` for success and show `data.message` for backend errors. Network errors are caught by the screen's `try/catch`; a timeout prevents endless loading.
7. `lib/types.ts` describes backend responses; `lib/format.ts` contains plain functions for money, dates, and overdue checks. `components/ledger-ui.tsx` contains the shared visual components and styles.

For React Native, `View` is the layout container, `Text` displays text, `TextInput` collects input, and `Pressable` handles taps. Home uses `FlatList` to render entries; forms use `ScrollView` inside a safe area and keyboard-aware container.

## Run on an iPhone with Expo Go

1. Start PostgreSQL and the existing backend on port 3000. Apply the backend migrations if needed.
2. In this directory, run `npm install`.
3. Copy `.env.example` to `.env.local`. Set `EXPO_PUBLIC_API_URL` to your computer's LAN address, for example `http://192.168.1.100:3000/api`. Do not use `localhost` on a physical phone; it refers to the phone itself. Without an override, the app tries the Expo development server's host on port 3000.
4. Keep your phone and computer on the same Wi-Fi and allow inbound connections to port 3000.
5. Run `npm start` and scan the QR code in Expo Go.
6. Enter a phone number, read the six-digit OTP in the **backend terminal**, and enter it in the app.

Restart Expo after changing an environment variable. An Expo tunnel only tunnels Metro; the backend still needs a reachable LAN address or its own HTTPS URL.

## Behavior

- Amounts are displayed in Indian rupees (INR). The backend stores one amount per loan with no currency field.
- Due dates use `YYYY-MM-DD`. Overdue means pending and due before today in **UTC**, matching the backend. Loans due today are not overdue.
- Login is held in memory. A full app reload requires logging in again; records remain in PostgreSQL. Persistent login can be added later with secure device storage.
- No example entries are inserted. Empty and error states are included.

## Check

```sh
npx tsc --noEmit
npx expo export --platform ios --output-dir /tmp/miniledger-ios-export
```

On a device, verify login, adding a loan, pulling to refresh, filters, repayment confirmation, and signing out. The backend smoke test lives in `../backend/scripts/smoke-test.cjs`.
