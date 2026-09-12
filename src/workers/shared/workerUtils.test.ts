import { checkRateLimited, respectRateLimit } from "./rateLimit";
import { describe, expect, test, beforeEach, mock } from "bun:test";
import { redisCache } from "@/lib/queue";

describe("Rate limit helpers", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("respectRateLimit", () => {
    test("should use retryAfter when provided", async () => {
      const setMock = mock(() => Promise.resolve("OK"));
      redisCache.set = setMock as typeof redisCache.set;

      const moveToDelayed = mock(() => Promise.resolve());
      const job = { id: "123", moveToDelayed } as any;

      const error = {
        meta: {
          retryAfter: 10,
        },
      };

      await respectRateLimit(error, job);

      expect(setMock).toHaveBeenCalledWith(
        "spotify:rate-limited-until",
        expect.any(Number),
        "PX",
        10_000,
      );

      expect(moveToDelayed).toHaveBeenCalledWith(expect.any(Number));
    });

    test("should default to 30 seconds when retryAfter is missing", async () => {
      const setMock = mock(() => Promise.resolve("OK"));
      redisCache.set = setMock as typeof redisCache.set;

      const moveToDelayed = mock(() => Promise.resolve());
      const job = { id: "123", moveToDelayed } as any;

      await respectRateLimit({}, job);

      expect(setMock).toHaveBeenCalledWith(
        "spotify:rate-limited-until",
        expect.any(Number),
        "PX",
        30_000,
      );

      expect(moveToDelayed).toHaveBeenCalledWith(expect.any(Number));
    });
  });

  describe("checkRateLimited", () => {
    test("should delay job and return true when rate limit is active", async () => {
      const waitUntil = Date.now() + 10_000;

      const getMock = mock(() => Promise.resolve(String(waitUntil)));
      redisCache.get = getMock as typeof redisCache.get;

      const moveToDelayed = mock(() => Promise.resolve());
      const job = { id: "123", moveToDelayed } as any;

      const result = await checkRateLimited(job);

      expect(getMock).toHaveBeenCalledWith("spotify:rate-limited-until");

      expect(moveToDelayed).toHaveBeenCalledWith(waitUntil);
      expect(result).toBe(true);
    });

    test("should return false when rate limit has expired", async () => {
      const waitUntil = Date.now() - 10_000;

      const getMock = mock(() => Promise.resolve(String(waitUntil)));
      redisCache.get = getMock as typeof redisCache.get;

      const moveToDelayed = mock(() => Promise.resolve());
      const job = { id: "123", moveToDelayed } as any;

      const result = await checkRateLimited(job);

      expect(moveToDelayed).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    test("should return false when no rate limit exists", async () => {
      const getMock = mock(() => Promise.resolve(null));
      redisCache.get = getMock as typeof redisCache.get;

      const moveToDelayed = mock(() => Promise.resolve());
      const job = { id: "123", moveToDelayed } as any;

      const result = await checkRateLimited(job);

      expect(moveToDelayed).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});
