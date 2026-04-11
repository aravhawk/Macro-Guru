/// <reference lib="webworker" />
import type { SerwistGlobalConfig } from "@serwist/serwist";
import { Serwist } from "@serwist/serwist";

declare global {
  interface WorkerGlobalScope {
    __SW_MANIFEST: SerwistGlobalConfig["__SW_MANIFEST"];
  }
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: "CacheFirst" as const,
      options: {
        cacheName: "google-fonts",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: "CacheFirst" as const,
      options: {
        cacheName: "gstatic-fonts",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
    {
      urlPattern: /\.(?:js|css|woff2|png|jpg|svg|ico)$/i,
      handler: "StaleWhileRevalidate" as const,
      options: {
        cacheName: "static-assets",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
  ],
});

serwist.addEventListeners();
