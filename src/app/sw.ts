import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Background Sync: when the browser regains connectivity, notify the client to process the queue
self.addEventListener("sync", (event: SyncEvent) => {
  if (event.tag === "workout-sync") {
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          client.postMessage({ type: "SYNC_REQUESTED" });
        }
      })()
    );
  }
});

// Listen for sync registration requests from the client
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "REGISTER_SYNC") {
    self.registration.sync?.register("workout-sync").catch(() => {
      // Background Sync API not supported — client-side polling handles it
    });
  }
});
