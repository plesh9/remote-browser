import express from "express";
import http from "http";
import { Server } from "ws";
import bodyParser from "body-parser";
import cors from "cors";
import { BrowserManager } from "./browserManager";

const app = express();
const server = http.createServer(app);
const wss = new Server({ server });

const browserManager = new BrowserManager();

app.use(cors());
app.use(bodyParser.json());

app.post("/api/open-url", async (req: any, res: any) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    await browserManager.launchBrowser(url);
    res.json({ message: "Browser launched successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to launch browser" });
  }
});

function compareUint8Arrays(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}


wss.on("connection", (ws) => {
  let lastScreenshot: Uint8Array | null = null;

  const sendScreenshot = async () => {
    const screenshot: Uint8Array | null = await browserManager.getScreenshot();
    if (screenshot && ws.readyState === ws.OPEN) {
      if (lastScreenshot && compareUint8Arrays(lastScreenshot, screenshot)) {
        return;
      }
      lastScreenshot = screenshot;
      ws.send(screenshot);
    }
  };

  const interval = setInterval(sendScreenshot, 30);

  ws.on("message", async (message) => {
    try {
      const event = JSON.parse(message.toString());
      if (event.type === "mouse") {
        await browserManager.handleMouseEvent(event);
      } else if (event.type === "keyboard") {
        await browserManager.handleKeyboardEvent(event);
      } else if (event.type === "paste") {
        await browserManager.handlePasteEvent(event);
      } else if (event.type === "selectAll") {
        await browserManager.handleSelectAllEvent();
      } else if (event.type === "copyText") {
        await browserManager.handleCopyTextEvent(ws);
      } else if (event.type === "blur") {
        await browserManager.handleBlurEvent(); 
      }
    } catch (err) {
      console.error("Error handling message:", err);
    }
  });

  ws.on("close", () => {
    clearInterval(interval);
    console.log("Client disconnected");
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
