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

wss.on("connection", (ws) => {
  const sendScreenshot = async () => {
    const screenshot = await browserManager.getScreenshot();
    if (screenshot && ws.readyState === ws.OPEN) {
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
