import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import { StoreProvider } from "./lib/store";
import { SyncProvider } from "./lib/sync";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StoreProvider>
      <SyncProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </SyncProvider>
    </StoreProvider>
  </React.StrictMode>
);
