import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import App from './App';
import './index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element was not found.');
}

const privyAppId = import.meta.env.VITE_PRIVY_APP_ID?.trim();

function ConfigurationRequired() {
  return (
    <main className="config-screen">
      <div className="brand-mark">Y</div>
      <p className="eyebrow">YALO WALLET</p>
      <h1>Configuration required</h1>
      <p>
        Add the public Privy App ID as <code>VITE_PRIVY_APP_ID</code> in your
        Cloudflare Pages environment variables, then redeploy the site.
      </p>
    </main>
  );
}

if (!privyAppId) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ConfigurationRequired />
    </React.StrictMode>
  );
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <PrivyProvider appId={privyAppId}>
        <App />
      </PrivyProvider>
    </React.StrictMode>
  );
}
