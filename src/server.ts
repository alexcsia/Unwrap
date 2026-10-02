import { createApp } from "./app";
import { redisConnection, redisCache } from "./lib/redis";

async function main() {
  const app = createApp();
  const PORT = process.env.PORT || 3000;
  const httpServer = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
