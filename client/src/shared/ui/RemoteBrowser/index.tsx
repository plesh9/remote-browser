import React, { useRef, useState } from "react";

const WINDOW_SIZE = { width: 1200, height: 800 };

const RemoteBrowser: React.FC = () => {
  const [url, setUrl] = useState("https://onlyfans.com/");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleConnect = async () => {
    const response = await fetch("http://localhost:4000/api/open-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await response.json();
    if (response.ok) {
      socketRef.current = new WebSocket("ws://localhost:4000");

      socketRef.current.onopen = () => {
        console.log("WebSocket connected");
        setConnected(true);
      };

      socketRef.current.onmessage = (event) => {
        const blob = new Blob([event.data], { type: "image/png" });
        const url = URL.createObjectURL(blob);
        if (imgRef.current) {
          imgRef.current.src = url;
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
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN)
      return;

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
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN)
      return;

    const isControlKey = e.ctrlKey || e.metaKey

    if (isControlKey && e.key === "v") {
      navigator.clipboard.readText().then((text) => {
        if (text) {
          const pasteEvent = {
            type: "paste",
            text,
          };
          socketRef.current?.send(JSON.stringify(pasteEvent));
        }
      });
    } else {
      const event = {
        type: "keyboard",
        eventType: "keydown",
        key: e.key,
      };
      socketRef.current.send(JSON.stringify(event));
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN)
      return;

    const event = {
      type: "keyboard",
      eventType: "keyup",
      key: e.key,
    };
    socketRef.current.send(JSON.stringify(event));
  };

  return (
    <div>
      <h1>Login OnlyFans</h1>
      <div>
        {/* <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL"
          style={{ width: "300px" }}
        /> */}
        <button onClick={handleConnect} disabled={connected}>
          Login
        </button>
      </div>
      {connected && (
        <div
          style={{
            userSelect: "none",
            cursor: "crosshair",
            display: "inline-flex",
            marginTop: "20px",
          }}
          onClick={handleMouseClick}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          tabIndex={0} // Для отримання подій клавіатури
        >
          <img
            ref={imgRef}
            alt="Remote Browser"
            draggable={false}
            style={{
              pointerEvents: "none",
              width: WINDOW_SIZE.width,
              height: WINDOW_SIZE.height,
              border: "1px solid #000",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default RemoteBrowser;
