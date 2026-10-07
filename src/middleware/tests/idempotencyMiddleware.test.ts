import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { NextFunction, Request, Response } from "express";
import { createIdempotencyMiddleware } from "../idempotency/idempotency.middleware";

const VALID_KEY = "valid-key-12345678";
const USER_ID = "user-1";
const SCOPED_KEY = `${USER_ID}:${VALID_KEY}`;

type FakeRepo = {
  tryLock: ReturnType<typeof mock>;
  forceLock: ReturnType<typeof mock>;
  get: ReturnType<typeof mock>;
  isGhostLock: ReturnType<typeof mock>;
  saveSuccess: ReturnType<typeof mock>;
  releaseLock: ReturnType<typeof mock>;
};

function makeRepo(overrides: Partial<FakeRepo> = {}): FakeRepo {
  return {
    tryLock: mock(async () => true),
    forceLock: mock(async () => true),
    get: mock(async () => null),
    isGhostLock: mock(() => false),
    saveSuccess: mock(async () => {}),
    releaseLock: mock(async () => {}),
    ...overrides,
  };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    method: "POST",
    headers: { "idempotency-key": VALID_KEY },
    user: { id: USER_ID },
    ...overrides,
  } as unknown as Request;
}

function makeRes() {
  const res: any = { statusCode: 200, body: undefined };
  res.status = mock((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = mock((body: any) => {
    res.body = body;
    return res;
  });
  res.send = mock((body: any) => {
    res.body = body;
    return res;
  });
  return res as Response & { body: any };
}

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

beforeEach(() => {
  process.env.NODE_ENV = "test";
});

describe("request gating", () => {
  test("skips non-mutating methods", async () => {
    const repo = makeRepo();
    const next = mock();
    await createIdempotencyMiddleware(repo as any)(
      makeReq({ method: "GET" }),
      makeRes(),
      next,
    );
    expect(next).toHaveBeenCalledWith();
    expect(repo.tryLock).not.toHaveBeenCalled();
  });

  test("skips in development", async () => {
    process.env.NODE_ENV = "development";
    const repo = makeRepo();
    const next = mock();
    await createIdempotencyMiddleware(repo as any)(makeReq(), makeRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect(repo.tryLock).not.toHaveBeenCalled();
    process.env.NODE_ENV = "test";
  });

  test("rejects a missing key", async () => {
    const mw = createIdempotencyMiddleware(makeRepo() as any);
    await expect(
      mw(makeReq({ headers: {} }), makeRes(), mock()),
    ).rejects.toThrow(/idempotency-key/i);
  });

  test("rejects a malformed key", async () => {
    const mw = createIdempotencyMiddleware(makeRepo() as any);
    await expect(
      mw(makeReq({ headers: { "idempotency-key": "!!" } }), makeRes(), mock()),
    ).rejects.toThrow();
  });

  test("rejects an unauthenticated request", async () => {
    const mw = createIdempotencyMiddleware(makeRepo() as any);
    await expect(
      mw(makeReq({ user: undefined }), makeRes(), mock()),
    ).rejects.toThrow();
  });
});

describe("new request", () => {
  test("calls next when the lock is acquired", async () => {
    const repo = makeRepo({ tryLock: mock(async () => true) });
    const next = mock();
    await createIdempotencyMiddleware(repo as any)(makeReq(), makeRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect(repo.tryLock).toHaveBeenCalledWith(SCOPED_KEY);
  });

  test("caches a 2xx response", async () => {
    const repo = makeRepo({ tryLock: mock(async () => true) });
    const res = makeRes();
    await createIdempotencyMiddleware(repo as any)(makeReq(), res, mock());

    res.status(201).json({ id: "x" });
    await flush();

    expect(repo.saveSuccess).toHaveBeenCalledTimes(1);
    const [key, statusCode, body] = repo.saveSuccess.mock.calls[0]!;
    expect(key).toBe(SCOPED_KEY);
    expect(statusCode).toBe(201);
    expect(body).toEqual({ id: "x" });
  });

  test("releases the lock on a non-2xx response", async () => {
    const repo = makeRepo({ tryLock: mock(async () => true) });
    const res = makeRes();
    await createIdempotencyMiddleware(repo as any)(makeReq(), res, mock());

    res.status(500).json({ error: "boom" });
    await flush();

    expect(repo.saveSuccess).not.toHaveBeenCalled();
    expect(repo.releaseLock).toHaveBeenCalledWith(SCOPED_KEY);
  });

  test("does not save twice when res.json and res.send both fire", async () => {
    const repo = makeRepo({ tryLock: mock(async () => true) });
    const res = makeRes();
    await createIdempotencyMiddleware(repo as any)(makeReq(), res, mock());

    res.status(200).json({ ok: true });
    res.send({ ok: true });
    await flush();

    expect(repo.saveSuccess).toHaveBeenCalledTimes(1);
  });
});

describe("replay", () => {
  test("returns the cached response and does not call next", async () => {
    const repo = makeRepo({
      tryLock: mock(async () => false),
      get: mock(async () => ({
        status: "SUCCESS",
        statusCode: 201,
        body: { id: "cached" },
      })),
    });
    const res = makeRes();
    const next = mock();

    await createIdempotencyMiddleware(repo as any)(makeReq(), res, next);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ id: "cached" });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("concurrency", () => {
  test("fails when a fresh PENDING lock exists", async () => {
    const repo = makeRepo({
      tryLock: mock(async () => false),
      get: mock(async () => ({
        status: "PENDING",
        lockedAt: Date.now() - 1_000,
      })),
      isGhostLock: mock(() => false),
    });
    const next = mock();

    await createIdempotencyMiddleware(repo as any)(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(Error);
  });
});

describe("recovery", () => {
  test("force-locks when the key vanished between tryLock and get", async () => {
    const repo = makeRepo({
      tryLock: mock(async () => false),
      get: mock(async () => null),
      forceLock: mock(async () => true),
    });
    const next = mock();

    await createIdempotencyMiddleware(repo as any)(makeReq(), makeRes(), next);

    expect(repo.forceLock).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  test("recovers a ghost lock and proceeds", async () => {
    const repo = makeRepo({
      tryLock: mock(async () => false),
      get: mock(async () => ({
        status: "PENDING",
        lockedAt: Date.now() - 999_999,
      })),
      isGhostLock: mock(() => true),
      forceLock: mock(async () => true),
    });
    const next = mock();

    await createIdempotencyMiddleware(repo as any)(makeReq(), makeRes(), next);

    expect(repo.forceLock).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  test("surfaces an error when forceLock refuses", async () => {
    const repo = makeRepo({
      tryLock: mock(async () => false),
      get: mock(async () => ({
        status: "PENDING",
        lockedAt: Date.now() - 999_999,
      })),
      isGhostLock: mock(() => true),
      forceLock: mock(async () => false),
    });
    const next = mock();

    await createIdempotencyMiddleware(repo as any)(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(Error);
  });
});
