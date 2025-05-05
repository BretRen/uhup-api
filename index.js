const express = require('express');
const app = express();
const port = process.env.PORT || 3000;  // 使用环境变量中的端口
app.listen(port, () => {
  console.log(`App is listening on port ${port}`);
});
