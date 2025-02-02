import React, { useEffect, useRef, useState } from "react";

const WINDOW_SIZE = { width: 375, height: 667 };
const ONLYFANS_URL = "https://onlyfans.com/";
const CRYPTO_KEY = "8gkL1@6z4mF0Q9$Pb2rXnC5Vd7jW3E0Q";
const SCREENSHOT_MESSAGE_TYPE = "kL3pRx";

async function importKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyData = enc.encode(CRYPTO_KEY);

  return await window.crypto.subtle.importKey(
    "raw",
    keyData,
    "AES-GCM",
    false,
    ["decrypt"]
  );
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function decryptData(
  encryptedBuffer: ArrayBuffer,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const iv = encryptedBuffer.slice(0, 12);
  const ciphertext = encryptedBuffer.slice(12);

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      key,
      ciphertext
    );
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw error;
  }
}

const RemoteBrowser: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageBitmap, setImageBitmap] = useState<ImageBitmap | null>(null);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);

  const handleConnect = async () => {
    const response = await fetch("http://localhost:4000/api/open-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: ONLYFANS_URL }),
    });
    const data = await response.json();
    if (response.ok) {
      socketRef.current = new WebSocket("ws://localhost:4000");

      socketRef.current.onopen = () => {
        console.log("WebSocket connected");
        setConnected(true);
      };

      socketRef.current.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "copyText") {
            await navigator.clipboard.writeText(message.text);
            console.log(`Copied to clipboard: ${message.text}`);
          } else if (message.type === SCREENSHOT_MESSAGE_TYPE) {
            if (!cryptoKey) {
              console.warn("Crypto key not loaded yet");
              return;
            }
            const encryptedBuffer = base64ToArrayBuffer(message.data);
            const decryptedBuffer = await decryptData(
              encryptedBuffer,
              cryptoKey
            );
            const decryptedBlob = new Blob([decryptedBuffer], {
              type: "image/png",
            });
            const imageBitmap = await createImageBitmap(decryptedBlob);
            setImageBitmap(imageBitmap);
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      socketRef.current.onclose = () => {
        console.log("WebSocket disconnected");
        setConnected(false);
      };
    } else {
      alert(`Error: ${data.error}`);
    }
  };

  const sendEvent = (eventData: object) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    socketRef.current.send(JSON.stringify(eventData));
  };

  const handleMouseClick = (e: React.MouseEvent) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    e.preventDefault();

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const event = {
      type: "mouse",
      eventType: "click",
      x,
      y,
    };
    socketRef.current.send(JSON.stringify(event));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      if (e.key === "c") {
        sendEvent({ type: "copyText" });
      } else if (e.key === "v") {
        navigator.clipboard.readText().then((text) => {
          sendEvent({ type: "paste", text });
        });
      } else if (e.key === "a") {
        sendEvent({ type: "selectAll" });
      }
    } else {
      sendEvent({ type: "keyboard", eventType: "keydown", key: e.key });
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    e.preventDefault();

    const event = {
      type: "keyboard",
      eventType: "keyup",
      key: e.key,
    };

    socketRef.current.send(JSON.stringify(event));
  };

  const handleBlur = () => {
    sendEvent({ type: "blur" });
  };

  useEffect(() => {
    importKey()
      .then(setCryptoKey)
      .catch((err) => {
        console.error("Failed to import crypto key:", err);
      });
  }, []);

  useEffect(() => {
    if (!imageBitmap) return;

    const drawImageOnCanvas = (imageBitmap: ImageBitmap) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imageBitmap, 0, 0);
    };

    drawImageOnCanvas(imageBitmap);
  }, [imageBitmap]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "24px",
        padding: "20px",
      }}
    >
      <h1>Login OnlyFans</h1>
      <div>
        <button onClick={handleConnect} disabled={connected}>
          Login
        </button>
      </div>
      {imageBitmap && (
        <canvas
          ref={canvasRef}
          style={{
            position: "relative",
            width: WINDOW_SIZE.width,
            height: WINDOW_SIZE.height,
            backgroundColor: "rgb(98, 98, 98)",
            borderRadius: "12px",
            overflow: "hidden",
            userSelect: "none",
            outline: "none",
            border: "1px solid rgb(51, 51, 51)",
            cursor: "crosshair",
            display: "inline-flex",
          }}
          onClick={handleMouseClick}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onBlur={handleBlur}
          tabIndex={0}
        />
      )}
    </div>
  );
};

export default RemoteBrowser;
