# MiniLedger

A small app for keeping track of money lent to friends. Sign in with a phone number, add a loan with a due date, and mark it repaid when the money comes back. The home screen shows total lent, total repaid, and overdue amounts, with overdue entries highlighted.

Built with React Native and Expo, an Express API in TypeScript, and PostgreSQL with Prisma.

## Requirements

- Node.js 22.23.1 or a newer LTS release, and npm
- Docker Compose, or an existing PostgreSQL database
- Expo Go on a phone, or an Android emulator / iOS simulator

## Run the backend

From the repository root:

```sh
cd backend
npm install
docker compose up -d
```

Create `backend/.env` with these values for the included Docker setup:

```env
DATABASE_URL="postgresql://postgres:postgrespass@localhost:5432/postgres"
JWT_SECRET="replace-with-a-long-random-secret"
```

If you use your own PostgreSQL instance, change `DATABASE_URL` accordingly. Once the database is ready:

```sh
npx prisma generate
npx prisma migrate deploy
npm run dev
```

The API runs on port **3000**. Use `npm start` to run without watching for file changes.

## Run the app

In a second terminal, from the repository root:

```sh
cd app
npm install
cp .env.example .env.local
```

Set `EXPO_PUBLIC_API_URL` in `app/.env.local` to the address your test device can reach:

| Device | API URL |
| --- | --- |
| Physical phone | `http://YOUR_COMPUTER_WIFI_IP:3000/api` |
| Android Studio emulator | `http://10.0.2.2:3000/api` |
| iOS simulator, backend on the same Mac | `http://localhost:3000/api` |

For a physical phone, keep both devices on the same Wi-Fi and allow inbound connections to port 3000. If the backend runs in WSL, use the Windows Wi-Fi IP and configure [WSL LAN access](https://learn.microsoft.com/en-us/windows/wsl/networking). Emulator addresses assume the backend is reachable from the host computer.

```sh
npm start
```

Scan the QR code with Expo Go, or press `a` / `i` for a configured emulator or simulator. Restart Expo after changing `.env.local`.

Enter a phone number to request an OTP. **The six-digit OTP is printed in the backend terminal; no SMS is sent.** Enter it in the app to log in.

To check connectivity from a phone, open `http://YOUR_COMPUTER_WIFI_IP:3000/api/loans` in its browser. A `no auth token sent` response means the API is reachable. An Expo tunnel exposes the app development server, not the backend.

## Checks

Loan entries can include an optional receipt photo (JPEG, PNG or WebP, up to 5 MB). Files are stored in `backend/uploads/receipts/`; PostgreSQL stores their paths. Only the loan owner can open a receipt. Keep this folder on persistent storage if deploying the backend.

Amounts are displayed in INR. Overdue dates use UTC and exclude loans due today. Login is kept in memory, so a full app reload requires another OTP; saved entries remain in PostgreSQL.
