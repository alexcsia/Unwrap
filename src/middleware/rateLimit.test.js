import express from "express";
import request from "supertest";
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { generalLimiter, authLimiter } from "./rateLimit.middleware";

describe("Rate Limiters", () => {
  let app;
  let server;

  beforeEach(() => {
    app = express();
    app.get("/test", generalLimiter, (req, res) => res.send("OK"));
    app.post("/auth", authLimiter, (req, res) => {
      const { succeed } = req.query;
      if (succeed === "true") {
        return res.status(200).json({ success: true });
      }
      return res.status(401).json({ error: "Invalid credentials" });
    });

    server = app.listen(0);

    authLimiter.resetKey("::ffff:127.0.0.1");
    authLimiter.resetKey("127.0.0.1");
    authLimiter.resetKey("::1");
  });

  afterEach(() => {
    server.close();
  });

  // ---------- General Limiter ----------
  test("general limiter allows up to 100 requests, then blocks", async () => {
    const maxRequests = 100;
    const url = "/test";

    for (let i = 0; i < maxRequests; i++) {
      const res = await request(server).get(url);
      expect(res.status).toBe(200);
    }

    const rateLimitedRes = await request(server).get(url);
    expect(rateLimitedRes.status).toBe(429);
    expect(rateLimitedRes.text).toContain("Too many requests from this IP");
  });

  // ---------- Auth Limiter (with failures) ----------
  test("auth limiter blocks after 5 failed attempts", async () => {
    const maxFailures = 5;
    const url = "/auth";

    for (let i = 0; i < maxFailures; i++) {
      const res = await request(server).post(url);
      expect(res.status).toBe(401);
    }

    const rateLimitedRes = await request(server).post(url);
    expect(rateLimitedRes.status).toBe(429);
    expect(rateLimitedRes.text).toContain("Too many login attempts");
  });

  // ---------- Auth Limiter with skipSuccessfulRequests ----------
  test("auth limiter does NOT count successful requests toward the limit", async () => {
    const url = "/auth?succeed=true";

    for (let i = 0; i < 5; i++) {
      const res = await request(server).post(url);
      expect(res.status).toBe(200);
    }

    const sixthRes = await request(server).post(url);
    expect(sixthRes.status).toBe(200);
  });
});
