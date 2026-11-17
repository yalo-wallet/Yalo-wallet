import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import App from './App';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element was not found.');
const appId = import.meta.env.VITE_PRIVY_APP_ID?.trim();
function SetupRequired() {
  return <main className="setup"><div className="brand-mark">Y</div><p className="eyebrow">YALO WALLET</p><h1>Configuration required</h1><p>Add <b>VITE_PRIVY_APP_ID</b> to Cloudflare Pages environment variables, then redeploy.</p></main>;
}
if (!appId) ReactDOM.createRoot(root).render(<React.StrictMode><SetupRequired /></React.StrictMode>);
else ReactDOM.createRoot(root).render(<React.StrictMode><PrivyProvider appId={appId} config={{embeddedWallets:{ethereum:{createOnLogin:'all-users'},solana:{createOnLogin:'all-users'}},appearance:{walletChainType:'ethereum-and-solana'}}}><App /></PrivyProvider></React.StrictMode>);
