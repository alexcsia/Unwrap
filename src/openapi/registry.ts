import {
  OpenAPIRegistry,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "@/openapi/zod";

import {
  createUserSchema,
  loginSchema,
  exclusionSchema,
  dateRangeSchema,
} from "@/schemas";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

registry.register("CreateUser", createUserSchema);
registry.register("Login", loginSchema);
registry.register("OAuthCallback", z.object({}));
registry.register("ExclusionParams", exclusionSchema);
registry.register("TopTracks", dateRangeSchema);
registry.register("TopArtists", dateRangeSchema);
registry.register("TimeListened", dateRangeSchema);

const unauthorizedResponse = {
  description: "Authentication required",
};

const badRequestResponse = {
  description: "Invalid request",
};

const notFoundResponse = {
  description: "Resource not found",
};

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Login",
  description: "Authenticate a user and return authentication tokens.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: loginSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "User logged in successfully",
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    429: {
      description: "Too many requests",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/connect/{platform}",
  tags: ["Auth"],
  summary: "Connect a music platform",
  description: "Start the OAuth connection flow for a music platform.",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      platform: z
        .enum([
          "spotify",
          "apple-music",
          "amazon-music",
          "tidal",
          "deezer",
          "qobuz",
        ])
        .openapi({
          param: {
            name: "platform",
            in: "path",
          },
        }),
    }),
  },
  responses: {
    302: {
      description: "Redirect to the platform authorization page",
    },
    401: unauthorizedResponse,
    400: badRequestResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/callback/{platform}",
  tags: ["Auth"],
  summary: "Handle music platform OAuth callback",
  description: "Complete the OAuth connection flow for a music platform.",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      platform: z.enum(["spotify", "apple-music"]).openapi({
        param: {
          name: "platform",
          in: "path",
        },
      }),
    }),
    // query: OAuthCallbackSchema,
  },
  responses: {
    200: {
      description: "Platform connected successfully",
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Refresh authentication tokens",
  description: "Refresh an expired or soon-to-expire access token.",
  responses: {
    200: {
      description: "Tokens refreshed successfully",
    },
    401: unauthorizedResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Logout",
  description: "Log out the currently authenticated user.",
  security: [{ bearerAuth: [] }],
  responses: {
    204: {
      description: "Logged out successfully",
    },
    401: unauthorizedResponse,
  },
});

registry.registerPath({
  method: "post",
  path: "/register",
  tags: ["Users"],
  summary: "Register a new user",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createUserSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "User created successfully",
    },
    400: badRequestResponse,
    409: {
      description: "Email already exists",
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/delete",
  tags: ["Users"],
  summary: "Delete the current user",
  security: [{ bearerAuth: [] }],
  responses: {
    204: {
      description: "User deleted successfully",
    },
    401: unauthorizedResponse,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/history/{platform}/upload",
  tags: ["Listening History"],
  summary: "Upload listening history",
  description: "Upload a ZIP archive containing listening history data.",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      platform: z.enum(["spotify", "apple-music", "amazon-music"]).openapi({
        param: {
          name: "platform",
          in: "path",
        },
      }),
    }),
    headers: z.object({
      "content-type": z.literal("multipart/form-data"),
      "idempotency-key": z.string().optional(),
    }),
    body: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: z.object({
            history: z.any().openapi({
              type: "string",
              format: "binary",
              description: "ZIP archive containing listening history",
            }),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Listening history upload accepted",
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    413: {
      description: "Uploaded file is too large",
    },
    429: {
      description: "Too many requests",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/exclusions/{type}/{targetId}",
  tags: ["Exclusions"],
  summary: "Create an exclusion",
  description: "Exclude an artist or track from analytics.",
  security: [{ bearerAuth: [] }],
  request: {
    params: exclusionSchema,
  },
  responses: {
    201: {
      description: "Exclusion created successfully",
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    409: {
      description: "Exclusion already exists",
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/exclusions/{type}/{targetId}",
  tags: ["Exclusions"],
  summary: "Delete an exclusion",
  description: "Remove an artist or track exclusion.",
  security: [{ bearerAuth: [] }],
  request: {
    params: exclusionSchema,
  },
  responses: {
    204: {
      description: "Exclusion deleted successfully",
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/exclusions",
  tags: ["Exclusions"],
  summary: "Get exclusions",
  description: "Get all exclusions belonging to the current user.",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Exclusions retrieved successfully",
    },
    401: unauthorizedResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/top-tracks",
  tags: ["Analytics"],
  summary: "Get top tracks",
  description: "Get the user's most-played tracks.",
  security: [{ bearerAuth: [] }],
  request: {
    query: dateRangeSchema,
  },
  responses: {
    200: {
      description: "Top tracks retrieved successfully",
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/top-artists",
  tags: ["Analytics"],
  summary: "Get top artists",
  description: "Get the user's most-played artists.",
  security: [{ bearerAuth: [] }],
  request: {
    query: dateRangeSchema,
  },
  responses: {
    200: {
      description: "Top artists retrieved successfully",
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/time-listened",
  tags: ["Analytics"],
  summary: "Get listening time",
  description: "Get listening-time analytics for the current user.",
  security: [{ bearerAuth: [] }],
  request: {
    query: dateRangeSchema,
  },
  responses: {
    200: {
      description: "Listening time retrieved successfully",
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
  },
});
