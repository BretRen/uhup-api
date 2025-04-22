import { Hono } from "hono";
import { Context } from "hono";
import { auth_users_c, auth_users_list } from "./auth/users.ts";
import { authMiddleware } from "./auth.ts";

const rateLimits: Record<string, { limit: number; windowMs: number }> = {
  "/api/auth/users/list": { limit: 5, windowMs: 60_000 },
  "/test": { limit: 3, windowMs: 180_000 },
};

const globalRateLimit = { limit: 100, windowMs: 5 * 60 * 1000 };
const calls = new Map();

function createRateLimitMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    const ip = c.req.header("x-forwarded-for") || "unknown";
    const path = c.req.path;
    const now = Date.now();

    const perRouteKey = `${path}:${ip}`;
    const globalKey = `global:${ip}`;

    const rule = rateLimits[path] || { limit: 10, windowMs: 60_000 };

    const checkLimit = (key: string, limit: number, windowMs: number) => {
      const record = calls.get(key) || { count: 0, start: now };
      if (now - record.start > windowMs) {
        calls.set(key, { count: 1, start: now });
        return { limited: false };
      }
      if (record.count >= limit) {
        return {
          limited: true,
          retryAfter: Math.ceil((windowMs - (now - record.start)) / 1000),
        };
      }
      record.count += 1;
      calls.set(key, record);
      return { limited: false };
    };

    const globalCheck = checkLimit(
      globalKey,
      globalRateLimit.limit,
      globalRateLimit.windowMs,
    );
    if (globalCheck.limited) {
      return c.json({
        message: "Rate limit exceeded (global)",
        retryAfter: globalCheck.retryAfter,
      }, 429);
    }

    const routeCheck = checkLimit(perRouteKey, rule.limit, rule.windowMs);
    if (routeCheck.limited) {
      return c.json({
        message: "Rate limit exceeded",
        retryAfter: routeCheck.retryAfter,
      }, 429);
    }

    await next();
  };
}

const app = new Hono();

// 创建一个子路由实例
const api = new Hono();

app.use("*", createRateLimitMiddleware());

api.get("/auth/users/list", authMiddleware, auth_users_list);
api.post("/auth/users/c", authMiddleware, auth_users_c);

// 将子路由挂载到 /api 路径下
app.route("/api", api);

app.get("/", (c) => c.text("Welcome to root"));

Deno.serve(app.fetch);
