import workerUtils from ".";
import {
  describe,
  expect,
  test,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from "bun:test";
import { redisCache } from "@/lib/redis";

let setSpy: ReturnType<typeof spyOn>;
let getSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  setSpy = spyOn(redisCache, "set");
  getSpy = spyOn(redisCache, "get");
});

afterEach(() => {
  setSpy.mockRestore();
  getSpy.mockRestore();
});

describe("Rate limit helpers", () => {
  describe("respectRateLimit", () => {
    test("should use retryAfter when provided", async () => {
      setSpy.mockResolvedValue("OK");

      const moveToDelayed = mock(() => Promise.resolve());
      const job = { id: "123", moveToDelayed } as any;

      const error = {
        retryAfter: 10,
      };

      await workerUtils.rateLimits.respectRateLimit(error, job);

      expect(setSpy).toHaveBeenCalledWith(
        "spotify:rate-limited-until",
        expect.any(Number),
        "PX",
        10_000,
      );

      expect(moveToDelayed).toHaveBeenCalledWith(expect.any(Number));
    });

    test("should default to 30 seconds when retryAfter is missing", async () => {
      setSpy.mockResolvedValue("OK");

      const moveToDelayed = mock(() => Promise.resolve());
      const job = { id: "123", moveToDelayed } as any;

      await workerUtils.rateLimits.respectRateLimit({}, job);

      expect(setSpy).toHaveBeenCalledWith(
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

      getSpy.mockResolvedValue(String(waitUntil));

      const moveToDelayed = mock(() => Promise.resolve());
      const job = { id: "123", moveToDelayed } as any;

      const result = await workerUtils.rateLimits.checkRateLimited(job);

      expect(getSpy).toHaveBeenCalledWith("spotify:rate-limited-until");

      expect(moveToDelayed).toHaveBeenCalledWith(waitUntil);
      expect(result).toBe(true);
    });

    test("should return false when rate limit has expired", async () => {
      const waitUntil = Date.now() - 10_000;

      getSpy.mockResolvedValue(String(waitUntil));

      const moveToDelayed = mock(() => Promise.resolve());
      const job = { id: "123", moveToDelayed } as any;

      const result = await workerUtils.rateLimits.checkRateLimited(job);

      expect(moveToDelayed).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    test("should return false when no rate limit exists", async () => {
      getSpy.mockResolvedValue(null);

      const moveToDelayed = mock(() => Promise.resolve());
      const job = { id: "123", moveToDelayed } as any;

      const result = await workerUtils.rateLimits.checkRateLimited(job);

      expect(moveToDelayed).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});
