import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept window.open to instantly style popups with a dark background to prevent any white flash.
if (typeof window !== "undefined") {
  const originalWindowOpen = window.open;
  window.open = function (url, name, specs) {
    const win = originalWindowOpen(url, name, specs);
    if (win) {
      try {
        const injectStyles = () => {
          try {
            const doc = win.document;
            if (doc) {
              if (doc.documentElement) {
                doc.documentElement.style.backgroundColor = "#0c0a09";
                doc.documentElement.style.color = "#ffffff";
              }
              if (doc.body) {
                doc.body.style.backgroundColor = "#0c0a09";
                doc.body.style.color = "#ffffff";
              }

              // Set color-scheme to dark to signal the browser to use a dark canvas during navigation/painting transitions
              let meta = doc.querySelector('meta[name="color-scheme"]');
              if (!meta) {
                meta = doc.createElement("meta");
                meta.setAttribute("name", "color-scheme");
                meta.setAttribute("content", "dark");
                if (doc.head) {
                  doc.head.appendChild(meta);
                } else if (doc.documentElement) {
                  doc.documentElement.appendChild(meta);
                }
              } else if (meta.getAttribute("content") !== "dark") {
                meta.setAttribute("content", "dark");
              }

              let style = doc.getElementById("prevent-white-flash-style");
              if (!style) {
                style = doc.createElement("style");
                style.id = "prevent-white-flash-style";
                style.textContent = `
                  html, body {
                    background-color: #0c0a09 !important;
                    background: #0c0a09 !important;
                    color: #ffffff !important;
                  }
                `;
                if (doc.head) {
                  doc.head.appendChild(style);
                } else if (doc.documentElement) {
                  doc.documentElement.appendChild(style);
                }
              }
            }
          } catch (e) {
            // Ignore same-origin security policy blockages (should not occur since we route authDomain through the current host)
          }
        };

        // Run immediately in the same call tick
        injectStyles();

        // Also hook onto load events to ensure style persistence during page loading transitions
        win.addEventListener("DOMContentLoaded", injectStyles, { once: true });
        win.addEventListener("load", injectStyles, { once: true });
        
        // Polling as a fallback during early paint phases
        let count = 0;
        const interval = setInterval(() => {
          injectStyles();
          if (++count > 20 || win.closed) {
            clearInterval(interval);
          }
        }, 30);
      } catch (err) {
        console.warn("[AntiFlash] Could not style popup:", err);
      }
    }
    return win;
  };
}

console.log(
  "%c🚀 Resumind - Versão 1.1.2-build (18/07/2026 - 12:48) - Sincronizado com Sucesso!",
  "color: #f97316; font-weight: bold; font-size: 13px; padding: 4px 8px; background-color: #0c0a09; border: 1px solid #292524; border-radius: 4px;"
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
