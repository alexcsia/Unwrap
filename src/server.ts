import { createApp } from "./app";
import { redisConnection, redisCache } from "@/lib/redis";
import { waitForRedis } from "./lib/utils";

async function main() {
  try {
    await Promise.all([
      waitForRedis(redisConnection, 5000),
      waitForRedis(redisCache, 5000),
    ]);
    console.log("[startup] redis ready");
  } catch (err) {
    console.error("[startup] redis unavailable, exiting", err);
    process.exit(1);
  }

  if (
    process.env.NODE_ENV === "development" &&
    process.env.MOCK_SPOTIFY === "true"
  ) {
    try {
      const { server } = await import("@/mocks/server");
      server.listen();
      console.log("Mocking Spotify API");
    } catch (err) {
      console.error("Failed to start MSW server:", err);
    }
  }

  const app = createApp();
  const PORT = process.env.PORT || 3000;
  const httpServer = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  const closeHttp = () =>
    new Promise<void>((resolve) => httpServer.close(() => resolve()));

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] ${signal} received`);

    setTimeout(() => {
      console.error("[shutdown] timed out, forcing exit");
      process.exit(1);
    }, 10_000).unref();
    try {
      await closeHttp();
      await Promise.all([redisConnection.quit(), redisCache.quit()]);
    } catch (e) {
      console.error("[shutdown] error closing redis", e);
    }
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
