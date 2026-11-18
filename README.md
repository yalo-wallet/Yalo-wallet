# YALO Wallet update 2.1

## Included
- Expanded wallet workspace: Overview, Swap, Send, Receive, Markets, Portfolio, Activity, Watchlist, Profile and Settings.
- Solana live token search/quote/swap flow using LI.FI quote endpoint.
- Native SOL send, EVM native ETH send on Ethereum and Base through the connected Privy EVM wallet.
- Chain-aware receive QR payload and camera QR scanning.
- DexScreener market search, chart and market metrics.
- Existing dark navy / gold visual direction preserved.

## Important implementation notes
- Configure `VITE_PRIVY_APP_ID` in Cloudflare Pages.
- Configure `LIFI_API_KEY` as a Cloudflare Pages Secret (not a VITE_ variable).
- The LI.FI endpoint is `functions/api/lifi/quote.ts`.
- Run the normal project build after uploading. This archive was assembled from the source shared in chat; it has not been built against your live Cloudflare/Privy project in this environment.
- Activity, watchlist, display name and avatar are session/browser state in this version, not synced to a backend.
- Portfolio currently displays native SOL and EVM ETH balances; full SPL/ERC-20 token indexing is not yet implemented.
- Swap currently executes a single returned Solana transaction request. Complex multi-step routes, token approvals and cross-chain execution are not covered by this simple transaction flow.
- Send currently supports native SOL and native ETH only. SPL/ERC-20 token transfers are not included.
- QR scanner requires camera permission and HTTPS (Cloudflare Pages provides HTTPS).
- Always verify recipient address, network, amount and fees before signing.
