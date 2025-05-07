import dotenv from "dotenv";
dotenv.config();
import { MongoClient } from "mongodb";

// 本地连接 URI 或远程 MongoDB Atlas URI
const uri = process.env.MONGO; // 从 .env 文件获取连接字符串

const client = new MongoClient(uri);

async function connectDB() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("uhup"); // 使用你想要的数据库
    return db;
  } catch (err) {
    console.error("❌ Failed to connect:", err);
  }
}

export { connectDB, client };
