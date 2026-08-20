import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import { startStateSync } from "./services/stateSync";
import { startTodoMaintenance } from "./services/todoMaintenance";

// Mark transparent auxiliary windows before React mounts. Waiting for :has()
// leaves the WebView's initial root canvas painted with the main window color.
const windowType = new URLSearchParams(window.location.search).get("window");
if (windowType === "pet" || windowType === "break-overlay") {
  document.documentElement.dataset.windowSurface = windowType;
}

startStateSync();
if (windowType !== "pet" && windowType !== "break-overlay") {
  startTodoMaintenance();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
