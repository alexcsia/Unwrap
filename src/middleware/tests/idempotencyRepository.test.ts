import { beforeEach, describe, expect, test } from "bun:test";
import {
  createIdempotencyRepository,
  type CachedResponse,
} from "../idempotency/idempotencyRepository";

function makeFakeCache() {
  const store = new Map<string, string>();
  const setCalls: any[][] = [];

  return {
    store,
    setCalls,
    async set(key: string, value: string, ...args: any[]) {
      setCalls.push([key, value, ...args]);
      if (args.includes("NX") && store.has(key)) return null;
      store.set(key, value);
      return "OK";
    },
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async del(key: string) {
      return store.delete(key) ? 1 : 0;
    },
  };
}

let cache: ReturnType<typeof makeFakeCache>;
let repo: ReturnType<typeof createIdempotencyRepository>;

beforeEach(() => {
  cache = makeFakeCache();
  repo = createIdempotencyRepository(cache as any);
});

describe("tryLock", () => {
  test("returns true when the key is free", async () => {
    expect(await repo.tryLock("abc")).toBe(true);
  });

  test("returns false when the key is already held", async () => {
    cache.store.set("idempotency:abc", "existing");
    expect(await repo.tryLock("abc")).toBe(false);
  });

  test("writes a PENDING record with a numeric lockedAt", async () => {
    await repo.tryLock("abc");
    const record: CachedResponse = JSON.parse(
      cache.store.get("idempotency:abc")!,
    );
    expect(record.status).toBe("PENDING");
    expect(typeof record.lockedAt).toBe("number");
  });

  test("issues SET idempotency:abc EX <ttl> NX", async () => {
    await repo.tryLock("abc", 3600);
    expect(cache.setCalls).toHaveLength(1);
    const [key, , ...args] = cache.setCalls[0]!;
    expect(key).toBe("idempotency:abc");
    expect(args).toEqual(["EX", 3600, "NX"]);
  });
});

describe("get", () => {
  test("returns null for a missing key", async () => {
    expect(await repo.get("nope")).toBeNull();
  });

  test("parses the stored JSON", async () => {
    const value: CachedResponse = {
      status: "SUCCESS",
      statusCode: 200,
      body: { ok: true },
    };
    cache.store.set("idempotency:abc", JSON.stringify(value));
    expect(await repo.get("abc")).toEqual(value);
  });
});

describe("isGhostLock", () => {
  test("returns false for SUCCESS", () => {
    expect(repo.isGhostLock({ status: "SUCCESS" })).toBe(false);
  });

  test("returns true for PENDING without lockedAt", () => {
    expect(repo.isGhostLock({ status: "PENDING" })).toBe(true);
  });

  test("returns true for PENDING older than the threshold", () => {
    expect(
      repo.isGhostLock({ status: "PENDING", lockedAt: Date.now() - 121_000 }),
    ).toBe(true);
  });

  test("returns false for a fresh PENDING", () => {
    expect(
      repo.isGhostLock({ status: "PENDING", lockedAt: Date.now() - 1_000 }),
    ).toBe(false);
  });
});

describe("saveSuccess", () => {
  test("writes a SUCCESS record with statusCode and body", async () => {
    await repo.saveSuccess("abc", 201, { id: "1" }, 86400);
    expect(JSON.parse(cache.store.get("idempotency:abc")!)).toEqual({
      status: "SUCCESS",
      statusCode: 201,
      body: { id: "1" },
    });
  });
});

describe("releaseLock", () => {
  test("deletes the scoped key", async () => {
    cache.store.set("idempotency:abc", "x");
    await repo.releaseLock("abc");
    expect(cache.store.has("idempotency:abc")).toBe(false);
  });
});

describe("forceLock", () => {
  test("writes a PENDING record and returns true", async () => {
    expect(await repo.forceLock("abc")).toBe(true);
    const record: CachedResponse = JSON.parse(
      cache.store.get("idempotency:abc")!,
    );
    expect(record.status).toBe("PENDING");
  });

  test("increments the stored attempt count", async () => {
    await repo.forceLock("abc", 86400, 1);
    const record: CachedResponse = JSON.parse(
      cache.store.get("idempotency:abc")!,
    );
    expect(record.attempts).toBe(2);
  });

  test("returns false once attempts exceed MAX_ATTEMPTS", async () => {
    expect(await repo.forceLock("abc", 86400, 4)).toBe(false);
  });
});
