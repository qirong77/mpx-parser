import express from "express";
const app = express();
const port = 3000;
import { parseMpxScript } from "./mpxScriptParser";
// 处理 Babel 转换请求
app.use("/babel/script", express.json(), (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: "No code provided" });
    }
    const transformedCode = parseMpxScript(code);
    res.json({ code: transformedCode });
});

// 启动服务器
app.listen(port, () => {
    console.log(`Babel server running at http://localhost:${port}`);
});
