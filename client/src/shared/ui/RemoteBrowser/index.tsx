import React, { useRef, useState } from "react";

const WINDOW_SIZE = { width: 375, height: 667 };
const ONLYFANS_URL = "https://onlyfans.com/";

const RemoteBrowser: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);

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
        if (typeof event.data === "string") {
          try {
            const message = JSON.parse(event.data);
            if (message.type === "copyText") {
              await navigator.clipboard.writeText(message.text);
              console.log(`Copied to clipboard: ${message.text}`);
            }
          } catch (err) {
            console.error("Error parsing WebSocket message:", err);
          }
        } else {
          const blob = new Blob([event.data], { type: "image/webp" });
          const newScreenshot = URL.createObjectURL(blob);
          setScreenshot(newScreenshot);
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

  const sendEvent = (eventData: object) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
      
    socketRef.current.send(JSON.stringify(eventData));
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
    }  else {
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

  const handleBlur = (_e: React.FocusEvent<HTMLDivElement>) => {
    sendEvent({ type: "blur" });
  };

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
      {screenshot && (
        <div
          style={{
            position: "relative",
            width: WINDOW_SIZE.width,
            height: WINDOW_SIZE.height,
            backgroundColor: "rgb(98 98 98)",
            borderRadius: "12px",
            overflow: "hidden",
            userSelect: "none",
            outline: "none",
            border: "1px solid rgb(51 51 51)",
            cursor: "crosshair",
            display: "inline-flex",
          }}
          onClick={handleMouseClick}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onBlur={handleBlur}
          tabIndex={0}
        >
          <img
            src={screenshot}
            alt="Remote Browser"
            draggable={false}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default RemoteBrowser;
