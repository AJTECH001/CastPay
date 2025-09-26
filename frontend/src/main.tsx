import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
// Polyfill Node's Buffer for browser usage when required by dependencies
import { Buffer } from "buffer";

import App from "./App.tsx";
import { config } from "./wagmi.ts";

import "./index.css";

// Attach Buffer to the global scope if not present
if (!("Buffer" in window)) {
  // @ts-expect-error attach for libs expecting global Buffer
  window.Buffer = Buffer;
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);
