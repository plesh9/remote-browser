import React, {useEffect, useRef, useState} from "react";
import {io, Socket} from "socket.io-client";
import {WS_EVENTS} from "../../ws/wsEvents.ts";

const WINDOW_SIZE = {width: 375, height: 667};

const RemoteBrowser: React.FC = () => {
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [imageBitmap, setImageBitmap] = useState<ImageBitmap | null>(null);

    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");

    const HARD_CODED_LOGIN = "laxow51879@minduls.com";
    const HARD_CODED_PASSWORD = "OnlyMonsters99";

    const handleConnect = async () => {
        if (socketRef.current) return;

        socketRef.current = io("ws://localhost:4000");

        socketRef.current.on("connect", () => {
            console.log("Socket.IO connected");
            setConnected(true);

            socketRef.current?.emit(WS_EVENTS.MOBILE_START_LISTENING, {
                // ofEmail: login,
                ofEmail: HARD_CODED_LOGIN,
                // ofPassword: password,
                ofPassword: HARD_CODED_PASSWORD,
                creatorId: "creator_id",
                deviceWidth: 390,
                deviceHeight: 844,
                deviceUserAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
            });
        });

        socketRef.current.on(WS_EVENTS.MOBILE_START_LISTENING, async (message) => {
            try {
                if (!message.image) {
                    console.error("No image received in the WebSocket message!");
                    return;
                }

                const imageBlob = await fetch(`data:image/png;base64,${message.image}`).then(res => res.blob());

                const imageBitmap = await createImageBitmap(imageBlob);

                setImageBitmap(imageBitmap);
            } catch (error) {
                console.error("Failed to process screenshot:", error);
            }
        });

        socketRef.current.on("disconnect", () => {
            console.log("Socket.IO disconnected");
            setConnected(false);
            socketRef.current = null;
        });
        // } else {
        //   alert(`Error: ${data.error}`);
        // }
    };

    const sendEvent = (eventData: object) => {
        if (!socketRef.current || !socketRef.current.connected) return;
        socketRef.current.emit("event", eventData);
    };

    // const handleMouseClick = (e: React.MouseEvent) => {
    //     if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
    //         return;
    //     }
    //
    //     e.preventDefault();
    //
    //     const rect = (e.target as HTMLElement).getBoundingClientRect();
    //     const x = e.clientX - rect.left;
    //     const y = e.clientY - rect.top;
    //
    //     const event = {
    //         type: "mouse",
    //         eventType: "click",
    //         x,
    //         y,
    //     };
    //     socketRef.current.send(JSON.stringify(event));
    // };

    const handleMouseClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        sendEvent({type: "mouse", eventType: "click", x: e.clientX - rect.left, y: e.clientY - rect.top});
    };

    // const handleKeyDown = (e: React.KeyboardEvent) => {
    //     e.preventDefault();
    //
    //     if (e.ctrlKey || e.metaKey) {
    //         if (e.key === "c") {
    //             sendEvent({type: "copyText"});
    //         } else if (e.key === "v") {
    //             navigator.clipboard.readText().then((text) => {
    //                 sendEvent({type: "paste", text});
    //             });
    //         } else if (e.key === "a") {
    //             sendEvent({type: "selectAll"});
    //         }
    //     } else {
    //         sendEvent({type: "keyboard", eventType: "keydown", key: e.key});
    //     }
    // };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.preventDefault();

        if (e.ctrlKey || e.metaKey) {
            if (e.key === "c") sendEvent({type: "copyText"});
            else if (e.key === "v") navigator.clipboard.readText().then((text) => sendEvent({type: "paste", text}));
            else if (e.key === "a") sendEvent({type: "selectAll"});
        } else {
            sendEvent({type: "keyboard", eventType: "keydown", key: e.key});
        }
    };

    // const handleKeyUp = (e: React.KeyboardEvent) => {
    //     if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
    //         return;
    //     }
    //
    //     e.preventDefault();
    //
    //     const event = {
    //         type: "keyboard",
    //         eventType: "keyup",
    //         key: e.key,
    //     };
    //
    //     socketRef.current.send(JSON.stringify(event));
    // };

    const handleKeyUp = (e: React.KeyboardEvent) => {
        e.preventDefault();
        sendEvent({type: "keyboard", eventType: "keyup", key: e.key});
    };

    const handleBlur = () => {
        sendEvent({type: "blur"});
    };

    // useEffect(() => {
    //     importKey()
    //         .then(setCryptoKey)
    //         .catch((err) => {
    //             console.error("Failed to import crypto key:", err);
    //         });
    // }, []);

    useEffect(() => {
        if (!imageBitmap || !canvasRef.current) {
            console.warn("No imageBitmap or canvas found.");
            return;
        }

        console.log("Drawing image on canvas...");

        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) {
            console.error("Canvas context is null!");
            return;
        }

        canvasRef.current.width = imageBitmap.width;
        canvasRef.current.height = imageBitmap.height;
        ctx.drawImage(imageBitmap, 0, 0);
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

            <input
                type="text"
                placeholder="Login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                style={{padding: "10px", marginBottom: "10px", width: "200px", display: "block"}}
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{padding: "10px", marginBottom: "10px", width: "200px", display: "block"}}
            />

            <button onClick={handleConnect} disabled={connected}>
                Login
            </button>
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
