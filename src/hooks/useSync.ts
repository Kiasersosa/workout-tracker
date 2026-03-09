"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { processAllQueue, getPendingCount, type SyncStatus } from "@/lib/sync";

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>("online");
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);

  // Update pending count periodically
  const refreshPending = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  // Run sync
  const sync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setStatus("syncing");

    try {
      const result = await processAllQueue();
      await refreshPending();

      if (result.totalFailed > 0) {
        setStatus("error");
      } else {
        setStatus("online");
      }
    } catch {
      setStatus("error");
    } finally {
      syncingRef.current = false;
    }
  }, [refreshPending]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setStatus("online");
      sync(); // Auto-sync when coming back online
    };

    const handleOffline = () => {
      setStatus("offline");
    };

    // Listen for background sync messages from service worker
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_REQUESTED") {
        sync();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);

    // Register for background sync
    navigator.serviceWorker?.ready.then((reg) => {
      reg.active?.postMessage({ type: "REGISTER_SYNC" });
    });

    // Set initial status
    if (!navigator.onLine) {
      setStatus("offline");
    }

    // Initial pending count
    refreshPending();

    // Poll pending count every 5s
    const interval = setInterval(refreshPending, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
      clearInterval(interval);
    };
  }, [sync, refreshPending]);

  // Auto-sync when there are pending items and we're online
  useEffect(() => {
    if (pendingCount > 0 && status === "online" && !syncingRef.current) {
      sync();
    }
  }, [pendingCount, status, sync]);

  return { status, pendingCount, sync, refreshPending };
}
