# YALO Wallet — Solana Live Trading

React + Vite wallet UI for Solana mainnet, Privy authentication/signing, LI.FI quote/execution, DexScreener token discovery/charting, and QR receive.

## Cloudflare Pages setup

1. Upload the contents of this folder to the GitHub repository connected to Cloudflare Pages.
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Add environment variables in Cloudflare Pages:
   - `VITE_PRIVY_APP_ID` = your public Privy App ID
   - `LIFI_API_KEY` = your LI.FI API key (secret; do not prefix with VITE)
5. Redeploy.

The LI.FI key is only read by `functions/api/lifi/quote.ts` on the server and is not bundled into the browser app.

## Trading behavior

- Token discovery and market charts use DexScreener public market data.
- Quotes are requested from LI.FI through the Pages Function proxy.
- A returned Solana transaction is deserialized and sent for explicit Privy wallet approval before broadcast.
- A trade is only shown as confirmed after Solana RPC confirmation.
- Not every token has a valid route or sufficient liquidity. Always verify mint addresses and quote details.

## Important

This is an implementation starter that must be built and tested in your own Cloudflare Pages environment with your Privy and LI.FI credentials before mainnet use. Public RPC endpoints can rate-limit. Review each transaction before signing.
