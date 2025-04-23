import { MiddlewareHandler } from "hono";
import { verify } from "@zaubrik/djwt";
import {
  Account,
  Client,
  Query,
  Teams,
} from "https://deno.land/x/appwrite/mod.ts";

const client = new Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("6803e7de003e77766886")
  .setKey(
    "standard_7dc53f49f2e08d694892e223efea74eaa907c26ab42dd1a737e96514aca2cad9c5e39adeba6cc52b2b5bbf2e769a1accfab7c2b58225b425f4ac19ac65fd99cbb82a27d1948abcd282da710996daaad7c983fbd4bbfed59b8b52a80d3c5ad5a3939162516c9329028651af1080eb8646cef5d14cdcb0469bc29755b287a5764a",
  );

const account = new Account(client);
const teams = new Teams(client);

const superAdminTeamId = "68044b0f00105ec315b4";
const adminTeamId = "68044b160015d54c5d20";

const secret:string = "3y1o23rgf2y399gr7ef";

const isUserInTeam = async (teamId: string, userId: string) => {
  const response = await teams.listMemberships(teamId, [
    Query.equal("userId", [userId]),
  ]);
  return response.memberships.length > 0;
};

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const jwt: string | undefined = c.req.header('X-Auth-Token');

  // 检查 token 是否存在
  if (!jwt) {
    return c.json({ error: "Token is required" }, 401);
  }

  try {
    // 使用 Web Crypto API 将字符串密钥转换为 CryptoKey 对象
    const key = await crypto.subtle.importKey(
      "raw", // 原始密钥格式
      new TextEncoder().encode(secret), // 将字符串转为字节数组
      { name: "HMAC", hash: { name: "SHA-256" } }, // 使用 HMAC 和 SHA-256
      false, // 密钥不可用于加密或解密
      ["verify"] // 密钥只用于验证
    );

    // 使用转换后的 CryptoKey 进行验证
    const payload = await verify(jwt, key);

    // 验证成功，将用户信息存入上下文中
    c.set("user", payload);
    console.log(payload.email); // 例如： "admin@example.com"
  } catch (err) {
    // 捕获 JWT 验证失败的错误
    console.error("Invalid or expired token", err);
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  await next();

  // if (!email || !password) {
  //   return c.json({ error: "Missing email or password" }, 400);
  // }

  // let session;
  // try {
  //   session = await account.createEmailPasswordSession(email, password);
  // } catch {
  //   return c.json({ error: "Invalid email or password" }, 401);
  // }

  // const { userId } = session;

  // const isSuperAdmin = await isUserInTeam(superAdminTeamId, userId);
  // const isAdmin = await isUserInTeam(adminTeamId, userId);

  // if (!(isSuperAdmin || isAdmin)) {
  //   return c.json({ error: "Permission denied" }, 403);
  // }

  // // 存到 context，路由中可取出使用
  // c.set("user", session);
  await next();
};
