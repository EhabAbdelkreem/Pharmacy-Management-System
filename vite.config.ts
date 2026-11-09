import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'hmr-silencer',
        transformIndexHtml: {
          order: 'pre',
          handler() {
            return [
              {
                tag: 'script',
                children: `
(function() {
  var OrigWS = window.WebSocket;
  if (!OrigWS) return;
  function SilentWS(url, protocols) {
    if (protocols === 'vite-hmr' || (typeof protocols === 'string' && protocols.indexOf('vite') !== -1) || (typeof url === 'string' && url.indexOf('run.app') !== -1)) {
      var t = new EventTarget();
      t.url = url;
      t.protocols = protocols;
      t.readyState = 1;
      t.send = function() {};
      t.close = function() {};
      t.onopen = null;
      t.onclose = null;
      t.onerror = null;
      t.onmessage = null;
      setTimeout(function() {
        if (t.onopen) t.onopen(new Event('open'));
        t.dispatchEvent(new Event('open'));
      }, 30);
      return t;
    }
    return new OrigWS(url, protocols);
  }
  SilentWS.prototype = OrigWS.prototype;
  SilentWS.CONNECTING = 0;
  SilentWS.OPEN = 1;
  SilentWS.CLOSING = 2;
  SilentWS.CLOSED = 3;
  window.WebSocket = SilentWS;
})();`,
                injectTo: 'head-prepend',
              },
            ];
          },
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'PharmaCore Enterprise | نظام إدارة الصيدليات',
          short_name: 'PharmaCore',
          description: 'نظام إدارة الصيدليات المتكامل مع البيع دون إنترنت والمزامنة السحابية',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
