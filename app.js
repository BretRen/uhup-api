import dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import User from "./user.js";
import { connectDB, client } from "./db.js"; // 使用命名导入

const fastify = Fastify();

// 连接数据库并创建 User 实例（允许顶层 await）
const user = new User(await connectDB());

// 定义一个简单的 GET 路由
fastify.get("/", async (request, reply) => {
  console.log(await user.find()); // 假设是同步方法，否则用 await
  return { hello: "world" };
});

const postSchema = {
  body: {
    type: "object",
    required: ["username", "password"],
    properties: {
      username: { type: "string", minLength: 3 },
      password: { type: "string", minLength: 8 },
    },
  },
};

// 定义一个 POST 路由来获取 JSON 参数，并进行验证
fastify.post("/reg", { schema: postSchema }, async (request, reply) => {
  const { username, password } = request.body; // 获取请求体中的 JSON 参数

  const result = await user.insertUser({
    username: username,
    password: password,
  });

  if (result.success) {
    console.log("User inserted successfully:", result.result);
  } else {
    console.log("Error:", result.message);
    return reply.code(400).send({ message: "error", error: result.message });
  }

  return reply
    .code(201)
    .send({ message: `Hello, ${username}. You password is ${password}.` });
});

// 获取端口环境变量，如果没有则默认使用 3000
const port = process.env.PORT || 3000;

// 启动服务器
async function start() {
  try {
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server listening at http://localhost:${port}/`);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}

start();
