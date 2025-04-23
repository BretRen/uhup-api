const kv = await Deno.openKv()

for await (const entry of kv.list({ prefix: [] })) {
    console.log("Key:", entry.key);
    console.log("Value:", entry.value);
  }
  