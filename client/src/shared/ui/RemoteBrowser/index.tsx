import React, {useEffect, useRef, useState} from "react";
import {io, Socket} from "socket.io-client";
import {WS_EVENTS} from "../../ws/wsEvents.ts";
import {MobileCaptchaScreenshotEventArgs} from "../../MobileCaptchaScreenshotEventArgs.ts";
import {MobileLoginStatus} from "../../MobileLoginStatus.ts";

// const WINDOW_SIZE = {width: 375, height: 667};

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

    const deviceWidth = window.innerWidth;
    const deviceHeight = window.innerHeight;
    const deviceUserAgent = navigator.userAgent;

    console.log('deviceWidth', deviceWidth);
    console.log('deviceHeight', deviceHeight);
    console.log('deviceUserAgent', deviceUserAgent);

    const handleConnect = async () => {
        if (socketRef.current) return;

        socketRef.current = io("ws://localhost:4000");

        socketRef.current.on("connect", () => {
            console.log("Socket.IO connected");
            setConnected(true);

            socketRef.current?.emit(WS_EVENTS.mobileStartLogin, {
                // ofEmail: login,
                ofEmail: HARD_CODED_LOGIN,
                // ofPassword: password,
                ofPassword: HARD_CODED_PASSWORD,
                creatorId: "creator_id",
                deviceWidth: window.innerWidth,
                deviceHeight: window.innerHeight,
                deviceUserAgent: window.navigator.userAgent,
                // deviceUserAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
            });
        });

        socketRef.current.on(WS_EVENTS.mobileCaptchaScreenshot, async (message: MobileCaptchaScreenshotEventArgs) => {
            try {
                if (!message.image) {
                    console.error("No image received in the WebSocket message!");
                    return;
                }

                const imageBlob = await fetch(`data:image/png;base64,${message.image}`).then(res => res.blob());

                const imageBitmap = await createImageBitmap(imageBlob);

                setScreenshotData({
                    imageBitmap,
                    width: Number(message.screenshotWidth),
                    height: Number(message.screenshotHeight),
                });
            } catch (error) {
                console.error("Failed to process screenshot:", error);
            }
        });

        socketRef.current.on(WS_EVENTS.mobileLoginStatus, (input: MobileLoginStatus) => {
                if (input === MobileLoginStatus.LOGGED_IN) {
                    console.log("Login successful!");
                }
            }
        )

        socketRef.current.on("disconnect", () => {
            console.log("Socket.IO disconnected");
            setConnected(false);
            socketRef.current = null;
        });
        // } else {
        //   alert(`Error: ${data.error}`);
        // }
    };

    const handleMouseAction = (type: "click", e: React.MouseEvent) => {
        if (!canvasRef.current || !socketRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        socketRef.current.emit(WS_EVENTS.mobileMouseAction, {type, x, y});
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
                    onClick={(e) => handleMouseAction("click", e)}
                    tabIndex={0}
                />
            )}
        </div>
    );
};

export default RemoteBrowser;
