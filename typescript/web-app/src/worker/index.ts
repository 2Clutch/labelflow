// Custom service worker code
// This can be customized
// See https://github.com/shadowwalker/next-pwa/blob/master/examples/offline-fallback/service-worker.js

import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import {
  NetworkOnly,
  // NetworkFirst,
  CacheFirst,
  StaleWhileRevalidate,
} from "workbox-strategies";
import {
  registerRoute,
  // setDefaultHandler,
  setCatchHandler,
} from "workbox-routing";
import {
  matchPrecache,
  precacheAndRoute,
  cleanupOutdatedCaches,
} from "workbox-precaching";

import { server as graphqlServer } from "./graphql-server";
import { server as fileServer } from "./file-server";

declare let self: ServiceWorkerGlobalScope;

// To disable all workbox logging during development, you can set self.__WB_DISABLE_DEV_LOGS to true
// https://developers.google.com/web/tools/workbox/guides/configure-workbox#disable_logging
//
// self.__WB_DISABLE_DEV_LOGS = true

self.addEventListener("message", (event) => {
  // HOW TO TEST THIS?
  // Run this in your browser console:
  //     window.navigator.serviceWorker.controller.postMessage({command: 'log', message: 'hello world'})
  // OR use next-pwa injected workbox object
  //     window.workbox.messageSW({command: 'log', message: 'hello world'})

  if (event?.data?.type === "SKIP_WAITING") {
    // Refresh service worker to next version
    self.skipWaiting();
    return;
  }

  console.warn("Received unsupported message from window:");
  console.warn(event?.data);
});

clientsClaim();
// Inject the manifest
// See https://github.com/GoogleChrome/workbox/issues/2519#issuecomment-634164566
// eslint-disable-next-line @typescript-eslint/no-use-before-define
// eslint-disable-next-line no-underscore-dangle
const WB_MANIFEST = self.__WB_MANIFEST;
console.log("WB_MANIFEST");
console.log(WB_MANIFEST);

precacheAndRoute(WB_MANIFEST);

cleanupOutdatedCaches();

// Install the listener of the graphql server
graphqlServer.installListener("/api/worker/graphql");

// Install the listener of the file server
fileServer.installListener("/api/worker/files");

// registerRoute(
//   /(\/$)|(\/graphiql\/?$)|(\/images\/?$)|(\/images\/.*\/?$)/i,
//   new StaleWhileRevalidate({
//     cacheName: "next-js-pages",
//     plugins: [
//       new ExpirationPlugin({
//         maxEntries: 1,
//         maxAgeSeconds: 86400 * 365,
//         purgeOnQuotaError: true,
//       }),
//     ],
//   }),
//   "GET"
// );

// registerRoute(/\/_next\/webpack-hmr\/.*$/i, new NetworkOnly({}), "GET");

registerRoute(
  /\/_next\/static\/webpack\/.*\.hot-update\..*$/i,
  new NetworkOnly({}),
  "GET"
);

registerRoute(
  /\/_next\/static\/.*$/i,
  new StaleWhileRevalidate({
    cacheName: "next-js-artifacts",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10000,
        maxAgeSeconds: 86400 * 7,
        purgeOnQuotaError: true,
      }),
    ],
  }),
  "GET"
);
registerRoute(
  /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
  new CacheFirst({
    cacheName: "google-fonts",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 86400 * 365,
        purgeOnQuotaError: true,
      }),
    ],
  }),
  "GET"
);
registerRoute(
  /\/static\/.*\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
  new StaleWhileRevalidate({
    cacheName: "static-font-assets",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 86400 * 7,
        purgeOnQuotaError: true,
      }),
    ],
  }),
  "GET"
);
registerRoute(
  /\/static\/.*\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
  new StaleWhileRevalidate({
    cacheName: "static-image-assets",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100000,
        maxAgeSeconds: 86400,
        purgeOnQuotaError: true,
      }),
    ],
  }),
  "GET"
);
registerRoute(
  /\/static\/.*\.(?:js)$/i,
  new StaleWhileRevalidate({
    cacheName: "static-js-assets",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 1000,
        maxAgeSeconds: 86400,
        purgeOnQuotaError: true,
      }),
    ],
  }),
  "GET"
);
registerRoute(
  /\/static\/.*\.(?:css|less)$/i,
  new StaleWhileRevalidate({
    cacheName: "static-style-assets",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 86400,
        purgeOnQuotaError: true,
      }),
    ],
  }),
  "GET"
);
registerRoute(
  /\/static\/.*\.(?:json|xml|csv)$/i,
  new StaleWhileRevalidate({
    cacheName: "static-data-assets",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 1000,
        maxAgeSeconds: 86400,
        purgeOnQuotaError: true,
      }),
    ],
  }),
  "GET"
);

// following lines gives you control of the offline fallback strategies
// https://developers.google.com/web/tools/workbox/guides/advanced-recipes#comprehensive_fallbacks

// // Use a stale-while-revalidate strategy for all other requests.
// setDefaultHandler(new StaleWhileRevalidate({}));

// This "catch" handler is triggered when any of the other routes fail to
// generate a response.
setCatchHandler(async ({ event }) => {
  // The FALLBACK_URL entries must be added to the cache ahead of time, either
  // via runtime or precaching. If they are precached, then call
  // `matchPrecache(FALLBACK_URL)` (from the `workbox-precaching` package)
  // to get the response from the correct cache.
  //
  // Use event, request, and url to figure out how to respond.
  // One approach would be to use request.destination, see
  // https://medium.com/dev-channel/service-worker-caching-strategies-based-on-request-types-57411dd7652c
  switch (event.request.destination) {
    case "document":
      // If using precached URLs:
      return (await matchPrecache("/_fallback")) ?? Response.error();
    // return caches.match('/fallback')
    // break;
    // case "image":
    //   // If using precached URLs:
    //   return matchPrecache("/static/images/fallback.png");
    // // return caches.match('/static/images/fallback.png')
    // // break;
    // case "font":
    //   // If using precached URLs:
    //   return matchPrecache(FALLBACK_FONT_URL);
    // // return caches.match('/static/fonts/fallback.otf')
    // // break
    default:
      // If we don't have a fallback, just return an error response.
      return Response.error();
  }
});
