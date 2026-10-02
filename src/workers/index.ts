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

  console.log("[worker] all workers started");

  const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} received, shutting down`);
    try {
      await Promise.all([
        historyWorker.close(),
        deleteUserWorker.close(),
        pollerWorker.close(),
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
