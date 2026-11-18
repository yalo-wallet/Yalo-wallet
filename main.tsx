import React from "react";
import ReactDOM from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import App from "./App";
import "./styles.css";

const appId = import.meta.env.VITE_PRIVY_APP_ID || "cmwmemgqs00vw0il6cak85xes";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "light",
          accentColor: "#b58a36",
          logo: undefined,
          showWalletLoginFirst: false
        },
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } }
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>
);