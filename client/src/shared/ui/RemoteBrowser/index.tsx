import React, {useEffect, useRef, useState} from "react";
import {io, Socket} from "socket.io-client";
import {WS_EVENTS} from "../../ws/wsEvents.ts";
import {MobileLoginStatus} from "../../MobileLoginStatus.ts";
import {MobileMouseEvent} from "../../types/MobileMouseActionInput.ts";
import {decryptMessage, encryptMessage} from "../../aes.ts";

const RemoteBrowser: React.FC = () => {
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [screenshotData, setScreenshotData] = useState<{
        imageBitmap: ImageBitmap;
        width: number;
        height: number;
    } | null>(null);

    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");

    const HARD_CODED_LOGIN = "laxow51879@minduls.com";
    const HARD_CODED_PASSWORD = "OnlyMonsters99";
    const userId = "667d42ab8d05f0551b300c2a";
    const creatorId = "66ec47016cf8a5aa395bee80";
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2N2Q0MmFiOGQwNWYwNTUxYjMwMGMyYSIsIm5hbWUiOiJWbGFkISIsImlhdCI6MTc0MDY2MDQwNywiZXhwIjoxNzQzMjUyNDA3fQ.QjSQkCb0zhyKgIEihoGtONo8fKuZaIDuYM-VLJ6LWL4';

    const deviceWidth = window.innerWidth;
    const deviceHeight = window.innerHeight;
    const deviceUserAgent = navigator.userAgent;

    console.log('deviceWidth', deviceWidth);
    console.log('deviceHeight', deviceHeight);
    console.log('deviceUserAgent', deviceUserAgent);

    const handleConnect = async () => {
        if (socketRef.current) return;

        socketRef.current = io("ws://localhost:4000", {
            transports: ["websocket"],
            auth: {
                token: token,
            }
        });

        socketRef.current.on("connect", () => {
            console.log("Socket.IO connected");
            setConnected(true);

            socketRef.current?.emit(WS_EVENTS.mobileStartLogin, {
                ofEmail: HARD_CODED_LOGIN,
                ofPassword: HARD_CODED_PASSWORD,
                creatorId,
                deviceWidth: window.innerWidth,
                deviceHeight: window.innerHeight,
                deviceUserAgent: window.navigator.userAgent,
            });
        });

        socketRef.current.on(WS_EVENTS.mobileCaptchaScreenshot, async (message) => {
            try {
                const decryptedMessage = await decryptMessage(message, creatorId, userId);
                const imageBlob = await fetch(`data:${decryptedMessage.contentType};base64,${decryptedMessage.image}`).then(res => res.blob());
                const imageBitmap = await createImageBitmap(imageBlob);

                setScreenshotData({
                    imageBitmap,
                    width: Number(decryptedMessage.screenshotWidth),
                    height: Number(decryptedMessage.screenshotHeight),
                });
            } catch (error) {
                console.error("Failed to process screenshot:", error);
            }
        });

        socketRef.current.on(WS_EVENTS.mobileLoginStatus, (input: {
            status: MobileLoginStatus,
            errMessage?: string
        }) => {
            switch (input.status) {
                case MobileLoginStatus.LOGGED_IN:
                    console.log("Login successful!");
                    break;
                case MobileLoginStatus.ERROR:
                    if (input.errMessage) console.error(`Login error: ${input.errMessage}`);
                    break;
                case MobileLoginStatus.CLOSED_BROWSER:
                    console.log("Browser closed!");
                    break;
            }
        });

        socketRef.current.on("disconnect", () => {
            console.log("Socket.IO disconnected");
            setConnected(false);
            socketRef.current = null;
        });
    };

    const handleMouseAction = async (type: MobileMouseEvent.CLICK, e: React.MouseEvent) => {
        if (!canvasRef.current || !socketRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const encryptedData = await encryptMessage({type, x, y}, creatorId, userId);

        socketRef.current.emit(WS_EVENTS.mobileMouseAction, {encryptedData, creatorId});
    };


    useEffect(() => {
        if (!screenshotData || !canvasRef.current) {
            console.warn("No imageBitmap or canvas found.");
            return;
        }

        console.log("Drawing image on canvas...");

        const drawImageOnCanvas = (imageBitmap: ImageBitmap) => {
            const canvas = canvasRef.current;

            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            canvas.width = imageBitmap.width;
            canvas.height = imageBitmap.height;
            canvas.style.width = `${screenshotData.width}px`;
            canvas.style.height = `${screenshotData.height}px`;

            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imageBitmap, 0, 0);
        };

        drawImageOnCanvas(screenshotData?.imageBitmap);
    }, [screenshotData]);

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
            {screenshotData && (
                <canvas
                    ref={canvasRef}
                    style={{
                        position: "relative",
                        backgroundColor: "rgb(98, 98, 98)",
                        borderRadius: "12px",
                        overflow: "hidden",
                        userSelect: "none",
                        outline: "none",
                        border: "1px solid rgb(51, 51, 51)",
                        cursor: "crosshair",
                        display: "inline-flex",
                    }}
                    onClick={(e) => handleMouseAction(MobileMouseEvent.CLICK, e)}
                    tabIndex={0}
                />
            )}
        </div>
    );
};

export default RemoteBrowser;
