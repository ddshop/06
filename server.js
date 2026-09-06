import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Coupang API server is running"
  });
});

app.post("/convert", async (req, res) => {
  try {
    const urls = req.body.urls;

    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        message: "請提供 urls"
      });
    }

    const accessKey = process.env.COUPANG_ACCESS_KEY;
    const secretKey = process.env.COUPANG_SECRET_KEY;

    if (!accessKey || !secretKey) {
      return res.status(500).json({
        success: false,
        message: "AccessKey 或 SecretKey 尚未設定"
      });
    }

    const method = "POST";
    const domain = "https://api-gateway.tw.coupang.com";
    const path =
      "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink";

    const now = new Date();

    const yy = String(now.getUTCFullYear()).slice(-2);
    const MM = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");
    const HH = String(now.getUTCHours()).padStart(2, "0");
    const mm = String(now.getUTCMinutes()).padStart(2, "0");
    const ss = String(now.getUTCSeconds()).padStart(2, "0");

    const datetime = `${yy}${MM}${dd}T${HH}${mm}${ss}Z`;

    const message = datetime + method + path;

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(message)
      .digest("hex");

    const authorization =
      `CEA algorithm=HmacSHA256, ` +
      `access-key=${accessKey}, ` +
      `signed-date=${datetime}, ` +
      `signature=${signature}`;

    const response = await fetch(domain + path, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        coupangUrls: urls
      })
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        success: false,
        message: "酷澎回傳的不是 JSON",
        status: response.status,
        raw: text.slice(0, 1500)
      });
    }

    return res.json({
      success: response.ok,
      status: response.status,
      data
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
