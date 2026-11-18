import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import App from './App';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element was not found.');
const appId = import.meta.env.VITE_PRIVY_APP_ID?.trim();

const isHttp = (u?: string) => !!u && /^https?:\/\//.test(u) && !u.includes('YOUR_');
const isWs = (u?: string) => !!u && /^wss?:\/\//.test(u) && !u.includes('YOUR_');
const solanaRpcUrl: string = [import.meta.env.VITE_SOLANA_RPC_URL, import.meta.env.VITE_HELIUS_RPC_URL].find(isHttp) ?? 'https://api.mainnet-beta.solana.com';
const solanaWsUrl: string = [import.meta.env.VITE_HELIUS_WS_URL, import.meta.env.VITE_SOLANA_WS_URL].find(isWs) ?? solanaRpcUrl.replace(/^http/, 'ws');

function SetupRequired() {
  return <main className="setup"><div className="brand-mark">Y</div><p className="eyebrow">YALO WALLET</p><h1>Configuration required</h1><p>Add <b>VITE_PRIVY_APP_ID</b> to Cloudflare Pages environment variables, then redeploy.</p></main>;
}

if (!appId) ReactDOM.createRoot(root).render(<React.StrictMode><SetupRequired /></React.StrictMode>);
else ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <PrivyProvider
      appId={appId}
      config={{
        embeddedWallets: { ethereum: { createOnLogin: 'all-users' }, solana: { createOnLogin: 'all-users' } },
        appearance: { walletChainType: 'ethereum-and-solana' },
        solana: {
          rpcs: {
            'solana:mainnet': {
              rpc: createSolanaRpc(solanaRpcUrl),
              rpcSubscriptions: createSolanaRpcSubscriptions(solanaWsUrl),
            },
          },
        },
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>
);
