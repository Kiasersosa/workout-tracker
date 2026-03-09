import { db, type SyncQueueItem } from "./db";

const MAX_RETRIES = 5;
const BATCH_SIZE = 50;

export type SyncStatus = "online" | "syncing" | "offline" | "error";

/** Get the number of pending items in the sync queue */
export async function getPendingCount(): Promise<number> {
  return db.syncQueue.count();
}

/** Process the sync queue — send batched items to the server */
export async function processQueue(): Promise<{
  synced: number;
  failed: number;
  remaining: number;
}> {
  const items = await db.syncQueue
    .orderBy("createdAt")
    .limit(BATCH_SIZE)
    .toArray();

  if (items.length === 0) {
    return { synced: 0, failed: 0, remaining: 0 };
  }

  try {
    const response = await fetch("/api/sheets/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Auth expired — don't retry, user needs to re-auth
        return { synced: 0, failed: items.length, remaining: items.length };
      }
      throw new Error(`Sync failed: ${response.status}`);
    }

    const result = await response.json();

    // Remove successfully synced items from queue
    const ids = items.map((i) => i.id!);
    await db.syncQueue.bulkDelete(ids);

    // Mark source records as synced
    const now = new Date().toISOString();
    for (const item of items) {
      if (item.type === "workoutSet" && item.data.id) {
        await db.workoutSets.update(item.data.id as number, { syncedAt: now });
      } else if (item.type === "bodyMeasurement" && item.data.id) {
        await db.bodyMeasurements.update(item.data.id as number, { syncedAt: now });
      }
    }

    const remaining = await getPendingCount();
    return { synced: result.synced ?? items.length, failed: 0, remaining };
  } catch (error) {
    console.error("Sync error:", error);

    // Increment retry count, remove items that exceeded max retries
    for (const item of items) {
      const newRetries = item.retries + 1;
      if (newRetries >= MAX_RETRIES) {
        await db.syncQueue.delete(item.id!);
      } else {
        await db.syncQueue.update(item.id!, { retries: newRetries });
      }
    }

    const remaining = await getPendingCount();
    return { synced: 0, failed: items.length, remaining };
  }
}

/** Process entire queue (multiple batches) until empty */
export async function processAllQueue(): Promise<{
  totalSynced: number;
  totalFailed: number;
}> {
  let totalSynced = 0;
  let totalFailed = 0;

  while (true) {
    const result = await processQueue();
    totalSynced += result.synced;
    totalFailed += result.failed;

    if (result.remaining === 0 || result.failed > 0) break;
  }

  return { totalSynced, totalFailed };
}
