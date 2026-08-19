import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Handle GitHub Pages SPA redirect: the 404.html fallback converts
// the original path into a ?p= query param. Restore it so client-side
// routing can detect the /portal/ route.
(function restoreSpaPath() {
  const params = new URLSearchParams(window.location.search);
  const p = params.get("p");
  if (p) {
    const path = "/" + p.replace(/~and~/g, "&");
    const hash = params.get("") || "";
    // Reconstruct the URL with the original path
    const baseUrl = window.location.origin + window.location.pathname;
    const newUrl = baseUrl + path + (window.location.hash || "");
    window.history.replaceState(null, "", newUrl);
  }
})();

// The customer support portal lives at /portal/ (or #portal).
// The main CRM app handles everything else.
const isPortalRoute = window.location.pathname.includes("/portal") ||
  window.location.hash.includes("portal");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App isPortalRoute={isPortalRoute} />
  </StrictMode>
);
