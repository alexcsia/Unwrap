import { redisConnection, redisCache } from "@/lib/redis";
import { waitForRedis } from "@/lib/utils";

async function main() {
  try {
    await Promise.all([
      waitForRedis(redisConnection, 10_000),
      waitForRedis(redisCache, 10_000),
    ]);
    console.log("[worker] redis ready");
  } catch (err) {
    console.error("[worker] redis unavailable, exiting", err);
    process.exit(1);
  }

  const { historyWorker } =
    await import("./historyIngestion/historyIngestion.worker");
  const { deleteUserWorker } = await import("./userDeletion/deleteUser.worker");
  const { pollerWorker } = await import("./platformPolling/poller.worker");
  const { musicBrainzWorker } =
    await import("./musicBrainzEnrichment/enrichment.worker");
  const { lastfmWorker } = await import("./lastfmEnrichment/enrichment.worker");

  console.log("[worker] all workers started");
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[worker] ${signal} received, shutting down`);
    setTimeout(() => {
      console.error("[worker] shutdown timed out, forcing exit");
      process.exit(1);
    }, 15_000).unref();
    try {
      await Promise.all([
        historyWorker.close(),
        deleteUserWorker.close(),
        pollerWorker.close(),
        musicBrainzWorker.close(),
        lastfmWorker.close(),
      ]);
      await Promise.all([redisConnection.quit(), redisCache.quit()]);
    } catch (e) {
      console.error("[worker] shutdown error", e);
    }
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
