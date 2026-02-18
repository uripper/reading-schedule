import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Workbox } from "workbox-window";
import { App } from "./App";
import { getDefaultAdapter } from "./adapters";
import { AdapterProvider } from "./components/AdapterProvider";
import "./styles/global.css";

const queryClient = new QueryClient();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  const wb = new Workbox("/sw.js");
  void wb.register();
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AdapterProvider adapter={getDefaultAdapter()}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AdapterProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
