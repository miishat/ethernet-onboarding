import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./styles/global.css";
import { ThemeProvider } from "./theme/ThemeContext";
import App from "./App";
import { initEmbed } from "./embed";

initEmbed();

function reviewToolsEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    const flag = new URLSearchParams(window.location.search).get("review");
    if (flag === "off") localStorage.removeItem("eos-review");
    else if (flag !== null) localStorage.setItem("eos-review", "1");
    return localStorage.getItem("eos-review") === "1";
  } catch {
    return false;
  }
}

const AnnotationLayer = reviewToolsEnabled() ? React.lazy(() => import("./dev/AnnotationLayer")) : null;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
      {AnnotationLayer && (
        <React.Suspense fallback={null}>
          <AnnotationLayer />
        </React.Suspense>
      )}
    </ThemeProvider>
  </React.StrictMode>,
);
