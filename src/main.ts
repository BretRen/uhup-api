import { Hono } from "hono";
import { Context } from "hono";
import { auth_users_c, auth_users_list } from "./auth/users.ts";
import { authMiddleware } from "./auth.ts";
import { randomString } from "./tool.ts";

import {
  Account,
  Client
} from "https://deno.land/x/appwrite/mod.ts";
import {
  // getCookie,
  // getSignedCookie,
  setCookie,
  // setSignedCookie,
  // deleteCookie,
} from 'hono/cookie'

const client = new Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("6803e7de003e77766886")
  .setKey(
    "standard_7dc53f49f2e08d694892e223efea74eaa907c26ab42dd1a737e96514aca2cad9c5e39adeba6cc52b2b5bbf2e769a1accfab7c2b58225b425f4ac19ac65fd99cbb82a27d1948abcd282da710996daaad7c983fbd4bbfed59b8b52a80d3c5ad5a3939162516c9329028651af1080eb8646cef5d14cdcb0469bc29755b287a5764a",
  );

const account = new Account(client);

const kv = await Deno.openKv()






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
api.post("/auth/users/login", async (c) => {
  let email, password;


  try {
    const body = await c.req.json();
    ({ email, password } = body); // 注意这里的括号！

  }catch {
    return c.json({error:"JSON parsing error!"},400)
  }


  if (!email || !password) {
    return c.json({ error: "用户名或密码不能为空" }, 400);
  }

  let session;
  try {
    session = await account.createEmailPasswordSession(email, password);
  } catch {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const randomSession: string =  randomString(16)

  await kv.set(["auth","auth","sessions",randomSession], session)


  setCookie(c, "token", randomSession, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24, // 1 天
    secure: true, // 如果你是 HTTPS，建议设为 true
    sameSite: "Strict",
  });



  // setCookie(c, 'cookie_name', 'cookie_value')
  // const yummyCookie = getCookie(c, 'cookie_name')
  // console.log(yummyCookie)
  return c.json({message:"ok"},200)

})

// 将子路由挂载到 /api 路径下
app.route("/api", api);

app.get("/", (c) => c.text("Welcome to root"));

Deno.serve(app.fetch);
