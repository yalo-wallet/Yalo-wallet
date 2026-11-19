
# YALO Wallet

A self-custodial multi-chain wallet built with React, TypeScript, Vite, Cloudflare Workers and Cloudflare D1.

## Supported Networks

- Ethereum
- Base
- Solana

## Main Technologies

- React
- TypeScript
- Vite
- Cloudflare Workers
- Cloudflare D1
- viem
- Solana Web3.js
- LI.FI SDK
- TanStack Query

## Project Structure

```text
yalo-wallet/
├── migrations/
│   └── 0001_init.sql
├── src/
│   ├── components/
│   │   └── ProtectedRoute.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── crypto.ts
│   │   ├── evm.ts
│   │   ├── lifi.ts
│   │   ├── solana.ts
│   │   └── wallet.ts
│   ├── pages/
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminLogin.tsx
│   │   ├── Login.tsx
│   │   ├── Swap.tsx
│   │   ├── Transactions.tsx
│   │   └── Wallet.tsx
│   ├── worker/
│   │   ├── admin.ts
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   └── index.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── wrangler.jsonc
└── README.md
```

## Requirements

- Node.js 20 or later
- npm
- Cloudflare account
- Cloudflare Workers
- Cloudflare D1 database
- Resend account for email OTP delivery

## Install Dependencies

```bash
npm install
```

## Create Cloudflare D1 Database

```bash
npx wrangler d1 create yalo-wallet-db
```

Copy the database ID returned by Cloudflare and put it in `wrangler.jsonc` under the D1 database configuration.

## Apply Database Migration

For local development:

```bash
npx wrangler d1 migrations apply yalo-wallet-db --local
```

For production:

```bash
npx wrangler d1 migrations apply yalo-wallet-db --remote
```

## Configure Secrets

Never put private secrets directly in source code.

Configure the following secrets through Cloudflare:

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put FROM_EMAIL
```

Additional RPC and service credentials should also be configured securely when required.

## Email Configuration

Configure a verified sender domain in Resend.

The sender address must be authorized by your email provider.

## Admin Account

Create the first administrator through a secure, one-time provisioning procedure.

- Use a unique admin email.
- Generate a strong password hash.
- Store the password hash securely.
- Enable real two-factor authentication.
- Never create a public admin registration route.
- Never store plaintext passwords or OTP codes.

The admin dashboard must remain protected by server-side authentication.

## Run Development Server

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

```bash
npm run deploy
```

## Security Requirements

- Never send wallet private keys or seed phrases to the backend.
- Never expose passwords, OTP codes or wallet secrets in admin analytics.
- Use secure session cookies.
- Validate all API requests on the server.
- Apply authentication and authorization to protected endpoints.
- Use rate limits for OTP and admin login.
- Verify blockchain transactions independently.
- Do not claim a transaction is successful until confirmed on-chain.
- Use HTTPS in production.

## Important Implementation Status

This repository is an initial implementation scaffold, not yet a verified production wallet.

Before handling real funds, complete and test:

1. EVM and Solana wallet creation and encrypted local storage.
2. Secure seed phrase generation, backup and recovery.
3. Real email OTP delivery and session security.
4. Admin TOTP setup and verification.
5. Admin account provisioning.
6. Real blockchain balance and transaction retrieval.
7. LI.FI quote validation, transaction signing and swap execution.
8. Public announcement endpoint.
9. Backend API implementation and database consistency.
10. Production build, security testing and deployment verification.

Features that are not implemented and verified must not be presented as working.

## License

Private project. All rights reserved.
```

---
