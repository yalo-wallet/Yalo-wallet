# YALO Wallet

Premium multi-chain Web3 wallet and trading platform for Ethereum Mainnet, Base Mainnet, and Solana Mainnet.

## Current foundation

- React, TypeScript, and Vite application.
- Privy authentication entry point.
- Supabase client initialization using a publishable key.
- Premium responsive wallet dashboard.
- Clear Coming Soon states for sections not yet connected to production services.

## Environment variables

Set these in Cloudflare Pages:

| Name | Type | Purpose |
| --- | --- | --- |
| `VITE_PRIVY_APP_ID` | Variable | Public Privy application ID used by the browser |
| `VITE_SUPABASE_URL` | Variable | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Variable | Supabase publishable key |

Keep all private credentials server-side only. Do not add Privy app secrets, Supabase secret keys, LI.FI credentials, or Helius credentials to frontend variables or source control.

The Privy app ID currently configured as `PRIVY_APP_ID` in Cloudflare must also be added as `VITE_PRIVY_APP_ID` because Vite only exposes variables prefixed with `VITE_` to browser code. The app ID is public; the Privy app secret is not.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Wallet balances, swaps, market feeds, portfolio history, and transaction indexing are not represented as live until their provider integrations and transaction flows are implemented and verified.
