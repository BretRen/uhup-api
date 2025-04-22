import type { Context } from "hono";
import {
  Account,
  Client,
  ID,
//   Query,
  Teams,
  Users,
} from "https://deno.land/x/appwrite/mod.ts";

const client = new Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("6803e7de003e77766886")
  .setKey(
    "standard_7dc53f49f2e08d694892e223efea74eaa907c26ab42dd1a737e96514aca2cad9c5e39adeba6cc52b2b5bbf2e769a1accfab7c2b58225b425f4ac19ac65fd99cbb82a27d1948abcd282da710996daaad7c983fbd4bbfed59b8b52a80d3c5ad5a3939162516c9329028651af1080eb8646cef5d14cdcb0469bc29755b287a5764a",
  );

const account = new Account(client);
// const teams = new Teams(client);
const users = new Users(client);
const teams = new Teams(client);

export const auth_users_list = async (c: Context) => {
    const result = await users.list();
    return c.json(result);
};

export const auth_users_c = async (c: Context) => {
    let body;
    try {
        body = await c.req.json()
    }catch {
        return c.json({error:"Please provide your email address and password and team."},400)
    }

    const { email, password, team, name } = body
    if (!email || !password || !team || !name) {
        return c.json({ error: "Missing email or password or team or name" }, 400);
    }

    if (team != "68047b2200300edc4685" && team != "68047b1a0026b2a5cda3" && team != "Admin"){
        return c.json({error:"Team can only be composed of Student(68047b2200300edc4685), Teacher(68047b1a0026b2a5cda3), Admin(68044b160015d54c5d20)"})
    }

    

    try {
        const user = await account.create(ID.unique(), email, password,name);
        console.log(user)
        const member = await teams.createMembership(
            team,
            [],
            user.email
            );
        console.log(member)
        return c.json({message:"ok",member,user})
    }catch (e) {
        return c.json({error:e},500)
    }

    
    
}