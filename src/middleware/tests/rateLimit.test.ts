import express from "express";
import rateLimit from "express-rate-limit";
import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, test } from "bun:test";

const servers: Server[] = [];

async function startApp(limiter: ReturnType<typeof rateLimit>, status = 200) {
  const app = express();

  app.use(limiter);

  app.get("/test", (_req, res) => {
    res.status(status).json({ ok: true });
  });

  const server = createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  servers.push(server);

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Failed to start test server");
  }

  return `http://127.0.0.1:${address.port}`;
}

async function request(url: string) {
  return fetch(`${url}/test`);
}

afterEach(async () => {
  await Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
    ),
  );

  servers.length = 0;
});

describe("generalLimiter", () => {
  test("allows requests up to the configured limit", async () => {
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 3,
      standardHeaders: true,
      legacyHeaders: false,
    });

    const url = await startApp(limiter);

    expect((await request(url)).status).toBe(200);
    expect((await request(url)).status).toBe(200);
    expect((await request(url)).status).toBe(200);
  });

  test("blocks requests after the configured limit", async () => {
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
      message: "Too many requests",
    });

    const url = await startApp(limiter);

    expect((await request(url)).status).toBe(200);
    expect((await request(url)).status).toBe(200);

    const response = await request(url);

    expect(response.status).toBe(429);
    expect(await response.text()).toContain("Too many requests");
  });

  test("sets standard rate-limit headers", async () => {
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 3,
      standardHeaders: true,
      legacyHeaders: false,
    });

    const url = await startApp(limiter);

    const response = await request(url);

    expect(response.headers.get("ratelimit-limit")).toBe("3");
    expect(response.headers.get("ratelimit-remaining")).toBe("2");
    expect(response.headers.get("ratelimit-reset")).toBeTruthy();
    expect(response.headers.get("x-ratelimit-limit")).toBeNull();
  });
});

describe("authLimiter", () => {
  test("allows up to 5 failed authentication attempts", async () => {
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 5,
      skipSuccessfulRequests: true,
      standardHeaders: true,
      legacyHeaders: false,
    });

    const url = await startApp(limiter, 401);

    for (let i = 0; i < 5; i++) {
      expect((await request(url)).status).toBe(401);
    }
  });

  test("blocks the 6th failed authentication attempt", async () => {
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 5,
      skipSuccessfulRequests: true,
      standardHeaders: true,
      legacyHeaders: false,
      message: "Too many login attempts",
    });

    const url = await startApp(limiter, 401);

    for (let i = 0; i < 5; i++) {
      expect((await request(url)).status).toBe(401);
    }

    const response = await request(url);

    expect(response.status).toBe(429);
    expect(await response.text()).toContain("Too many login attempts");
  });

  test("does not count successful requests", async () => {
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 2,
      skipSuccessfulRequests: true,
      standardHeaders: true,
      legacyHeaders: false,
    });

    const url = await startApp(limiter, 200);

    for (let i = 0; i < 10; i++) {
      expect((await request(url)).status).toBe(200);
    }
  });

  test("counts failed requests while ignoring successful requests", async () => {
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 2,
      skipSuccessfulRequests: true,
      standardHeaders: true,
      legacyHeaders: false,
    });

    const app = express();

    app.use(limiter);

    let shouldFail = true;

    app.get("/login", (_req, res) => {
      if (shouldFail) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      res.status(200).json({ ok: true });
    });

    const server = createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });

    servers.push(server);

    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Failed to start test server");
    }

    const url = `http://127.0.0.1:${address.port}/login`;

    expect((await fetch(url)).status).toBe(401);

    shouldFail = false;

    expect((await fetch(url)).status).toBe(200);
    expect((await fetch(url)).status).toBe(200);
    expect((await fetch(url)).status).toBe(200);

    shouldFail = true;

    expect((await fetch(url)).status).toBe(401);

    const blocked = await fetch(url);

    expect(blocked.status).toBe(429);
  });
});

describe("rate limiter isolation", () => {
  test("does not share state between limiter instances", async () => {
    const limiterA = rateLimit({
      windowMs: 60_000,
      max: 1,
      standardHeaders: true,
      legacyHeaders: false,
    });

    const limiterB = rateLimit({
      windowMs: 60_000,
      max: 1,
      standardHeaders: true,
      legacyHeaders: false,
    });

    const urlA = await startApp(limiterA);
    const urlB = await startApp(limiterB);

    expect((await request(urlA)).status).toBe(200);
    expect((await request(urlA)).status).toBe(429);

    expect((await request(urlB)).status).toBe(200);
  });
});
