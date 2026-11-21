import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./fusion-refresh.css";

const themeKey = 'fusion-x-theme';
const storedTheme = localStorage.getItem(themeKey);
const publicMarketingRoute = /^(\/|\/marketing|\/about|\/services|\/pricing|\/blog(?:\/.*)?|\/contact|\/signup|\/privacy|\/terms|\/cookies)$/.test(window.location.pathname);
const initialDark = storedTheme ? storedTheme === 'dark' : publicMarketingRoute || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
document.documentElement.classList.toggle('dark', initialDark);
document.documentElement.dataset.theme = initialDark ? 'dark' : 'light';

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
