import crypto from "crypto";

const algorithm = "aes-256-cbc"; // 加密算法
const salt = "salt"; // 用于生成密钥的盐
const password = "mystrongpassword"; // 这是用来生成密钥的密码

export default class User {
  constructor(conn) {
    this.collection = conn.collection("users"); // 使用传入的连接获取数据库实例
  }

  // 加密函数
  #encrypt(text, password) {
    const key = crypto.scryptSync(password, salt, 32); // 使用密码生成密钥
    const iv = crypto.randomBytes(16); // 随机生成初始化向量
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return { iv: iv.toString("hex"), encryptedData: encrypted }; // 返回加密数据和 iv
  }

  // 解密函数
  #decrypt(encryptedText, password, ivHex) {
    const iv = Buffer.from(ivHex, "hex");
    const key = crypto.scryptSync(password, salt, 32); // 使用密码生成密钥
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  async find(query = {}) {
    const cursor = await this.collection.find(query);
    return await cursor.toArray(); // 转换为数组
  }

  async insertUser(data) {
    const existingUser = await this.find({ username: data.username });
    if (existingUser.length > 0) {
      return { success: false, message: "Username is already taken" }; // 返回错误信息
    }

    const { iv, encryptedData } = this.#encrypt(data.password, password); // 使用加密方法
    const doc = {
      username: data.username,
      password: encryptedData, // 存储加密后的密码
      iv: iv, // 存储 iv 以便解密时使用
    };

    const result = await this.collection.insertOne(doc);
    console.log(`A document was inserted with the _id: ${result.insertedId}`);
    return { success: true, result }; // 返回插入结果
  }

  async authenticateUser(username, password) {
    const user = await this.find({ username });
    if (user.length === 0) {
      return { success: false, message: "User not found" };
    }

    const encryptedPassword = user[0].password;
    const iv = user[0].iv; // 获取存储的 iv
    const decryptedPassword = this.#decrypt(encryptedPassword, password, iv); // 解密密码

    if (decryptedPassword === password) {
      return { success: true, message: "Authentication successful" };
    } else {
      return { success: false, message: "Invalid password" };
    }
  }
}
