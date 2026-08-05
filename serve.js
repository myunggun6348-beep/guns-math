/* =========================================================
   이 파일은 "폰으로 보기.bat" 을 더블클릭하면 자동으로 실행됩니다.
   직접 켜고 싶으면 이 폴더에서 명령창에  node serve.js  라고 치면 됩니다.

   하는 일: 이 폴더의 파일을 같은 와이파이 안에서 볼 수 있게 열어 줍니다.
   설치할 것은 없습니다 (Node.js 에 들어 있는 기능만 씁니다).
   ========================================================= */
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = process.argv[2] || __dirname;
const PORT = +(process.argv[3] || 5173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  // 글꼴 — 빠지면 폰에서 글씨가 다른 모양으로 보일 수 있습니다
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

/* 이 컴퓨터가 와이파이에서 갖는 주소를 찾습니다.
   주소는 공유기가 그때그때 정해 주므로 매번 달라질 수 있습니다.
   그래서 외워 두지 말고, 켤 때마다 아래에 찍히는 것을 보세요. */
function 내주소들() {
  const 결과 = [];
  const nets = os.networkInterfaces();
  for (const 이름 of Object.keys(nets)) {
    for (const n of nets[이름] || []) {
      if (n.family === "IPv4" && !n.internal) 결과.push({ 이름, 주소: n.address });
    }
  }
  return 결과;
}

http
  .createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("파일을 찾을 수 없습니다");
        return;
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
      res.end(data);
    });
  })
  // 주소를 안 적으면 이 컴퓨터의 모든 연결(와이파이 포함)에서 받습니다 — 폰이 들어올 수 있는 이유
  .listen(PORT, () => {
    const 줄 = "=".repeat(52);
    console.log("\n" + 줄);
    console.log("  홈페이지가 켜졌습니다. 이 창을 닫으면 꺼집니다.");
    console.log(줄);
    console.log("\n  [이 컴퓨터에서 보기]");
    console.log("    http://localhost:" + PORT);
    const 목록 = 내주소들();
    if (목록.length) {
      console.log("\n  [폰에서 보기]  폰이 같은 와이파이에 있어야 합니다.");
      console.log("  폰 브라우저 주소창에 아래를 그대로 치세요:\n");
      for (const it of 목록) console.log("    http://" + it.주소 + ":" + PORT + "      (" + it.이름 + ")");
      console.log("\n  * Wi-Fi 라고 적힌 것부터 해 보세요.");
      console.log("  * 안 열리면: 처음 켤 때 뜨는 Windows 방화벽 창에서");
      console.log("    '개인 네트워크'에 체크하고 [액세스 허용]을 눌러야 합니다.");
    } else {
      console.log("\n  와이파이에 연결되어 있지 않아 폰에서 볼 주소가 없습니다.");
    }
    console.log("\n" + 줄 + "\n");
  });
