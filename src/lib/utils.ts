import IORedis from "ioredis";

export async function waitForRedis(client: IORedis, timeoutMs = 5000) {
  if (client.status === "ready") return;

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Redis not ready after ${timeoutMs}ms (status=${client.status})`,
        ),
      );
    }, timeoutMs);

    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = (e: Error) => {
      cleanup();
      reject(e);
    };

    function cleanup() {
      clearTimeout(t);
      client.off("ready", onReady);
      client.off("error", onError);
    }

    client.once("ready", onReady);
    client.once("error", onError);
  });
}
