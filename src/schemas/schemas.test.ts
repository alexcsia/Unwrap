import { expect, test, describe } from "bun:test";
import {
  loginSchema,
  uploadHistorySchema,
  topTracksSchema,
  topArtistsSchema,
  timeListenedSchema,
  createUserSchema,
  exclusionParamsSchema,
  getHistorySchema,
  spotifyCallbackSchema,
} from "@/schemas";
import type { ZodSchema } from "zod";

const createMockFile = (
  originalname: string,
  size: number,
  mimetype: string,
) => ({
  originalname,
  size,
  mimetype,
  path: "/tmp/mock-file.zip",
});

const testAnalyticsSchemas = <T extends { limit?: any; offset?: any }>(
  schema: ZodSchema<T>,
  schemaName: string,
) => {
  describe(schemaName, () => {
    test("should pass with perfectly valid minimal data", () => {
      const payload = { limit: 10, offset: "0" };
      const result = schema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
      }
    });

    test("should pass when month is accompanied by year", () => {
      const payload = { month: 7, year: 2020 };
      const result = schema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    test("should fail when month is provided without a year", () => {
      const payload = { month: 7 };
      const result = schema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toBe(
          "Month filter requires a year",
        );
      }
    });

    test("should pass when both 'from' and 'to' range strings are provided", () => {
      const payload = { from: "2026-01-01", to: "2026-01-31" };
      const result = schema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    test("should fail when only 'from' is provided without 'to'", () => {
      const payload = { from: "2026-01-01" };
      const result = schema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toBe(
          "Custom ranges require both 'from' and 'to'",
        );
      }
    });

    test("should enforce maximum limit constraints", () => {
      const payload = { limit: 150 }; // Max allowed is 100
      const result = schema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
};

testAnalyticsSchemas(topArtistsSchema, "top artists schema");
testAnalyticsSchemas(topTracksSchema, "top tracks schema");
testAnalyticsSchemas(timeListenedSchema, "time listened schema");

describe("Auth Schemas", () => {
  describe("createUserSchema", () => {
    test("should pass with perfectly valid details", () => {
      const payload = {
        email: "test@unwrap.com",
        displayName: "Dorian",
        password: "password123",
      };
      expect(createUserSchema.safeParse(payload).success).toBe(true);
    });

    test("should fail on invalid email format", () => {
      const payload = {
        email: "notanemail",
        displayName: "Dorian",
        password: "password123",
      };
      expect(createUserSchema.safeParse(payload).success).toBe(false);
    });

    test("should enforce displayName minimum length bounds", () => {
      const payload = {
        email: "test@unwrap.com",
        displayName: "Do",
        password: "password123",
      };
      expect(createUserSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    test("should pass on clean credentials formatting", () => {
      const payload = { email: "user@unwrap.com", password: "strongpassword" };
      expect(loginSchema.safeParse(payload).success).toBe(true);
    });
  });

  describe("spotifyCallbackSchema", () => {
    test("should pass when both optional query params are valid strings", () => {
      const payload = { code: "AQB123...", state: "xyz987" };
      expect(spotifyCallbackSchema.safeParse(payload).success).toBe(true);
    });

    test("should pass when query params are completely empty", () => {
      expect(spotifyCallbackSchema.safeParse({}).success).toBe(true);
    });
  });
});

describe("History Schemas", () => {
  describe("uploadHistorySchema", () => {
    test("should pass with a valid, non-empty ZIP archive under 50MB", () => {
      const validFile = createMockFile(
        "history.zip",
        1024 * 1024,
        "application/zip",
      );
      const payload = { platform: "spotify", file: validFile };

      expect(uploadHistorySchema.safeParse(payload).success).toBe(true);
    });

    test("should fail if file size is 0 bytes", () => {
      const emptyFile = createMockFile("history.zip", 0, "application/zip");
      const payload = { platform: "apple_music", file: emptyFile };

      const result = uploadHistorySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toBe("File is empty");
      }
    });

    test("should fail if file size exceeds 50MB", () => {
      const hugeFile = createMockFile(
        "history.zip",
        51 * 1024 * 1024,
        "application/zip",
      );
      const payload = { platform: "spotify", file: hugeFile };

      const result = uploadHistorySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toBe("File too large");
      }
    });

    test("should fail if file extension or mime-type is not a ZIP configuration", () => {
      const textFile = createMockFile("history.json", 1024, "application/json");
      const payload = { platform: "spotify", file: textFile };

      const result = uploadHistorySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toBe(
          "File must be a ZIP archive",
        );
      }
    });
  });

  describe("getHistorySchema", () => {
    test("should accept supported platforms", () => {
      expect(getHistorySchema.safeParse({ platform: "spotify" }).success).toBe(
        true,
      );
      expect(
        getHistorySchema.safeParse({ platform: "apple_music" }).success,
      ).toBe(true);
    });
  });
});

describe("Exclusion Schemas", () => {
  describe("exclusionParamsSchema", () => {
    test("should pass for a valid artist filtering scope", () => {
      const payload = { type: "artist", targetId: "4gzpz0Cg6wGB98gXz6S79A" };
      expect(exclusionParamsSchema.safeParse(payload).success).toBe(true);
    });

    test("should pass for a valid track filtering scope", () => {
      const payload = { type: "track", targetId: "12345" };
      expect(exclusionParamsSchema.safeParse(payload).success).toBe(true);
    });

    test("should fail if type is neither artist nor track", () => {
      const payload = { type: "album", targetId: "123" };
      expect(exclusionParamsSchema.safeParse(payload).success).toBe(false);
    });

    test("should fail if targetId is an empty string", () => {
      const payload = { type: "artist", targetId: "" };
      expect(exclusionParamsSchema.safeParse(payload).success).toBe(false);
    });
  });
});
