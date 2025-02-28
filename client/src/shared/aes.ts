import {MobileCaptchaScreenshotEventArgs} from "./MobileCaptchaScreenshotEventArgs.ts";
import {SocketIoMobileLoginStatusInput} from "./types/SocketIoMobileLoginStatusInput.ts";

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export async function getCryptoKey(creatorId: string, userId: string): Promise<CryptoKey> {
    const keyString = `key_${creatorId}_${userId}`;
    const keyBuffer = new TextEncoder().encode(keyString);

    return await window.crypto.subtle.importKey(
        "raw",
        await window.crypto.subtle.digest("SHA-256", keyBuffer),
        {name: "AES-GCM"},
        false,
        ["encrypt", "decrypt"]
    );
}

export const encryptMessage = async (message: object, creatorId: string, userId: string): Promise<string> => {
    const key = await getCryptoKey(creatorId, userId);
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const encodedMessage = new TextEncoder().encode(JSON.stringify(message));
    const encrypted = await window.crypto.subtle.encrypt(
        {name: "AES-GCM", iv},
        key,
        encodedMessage
    );

    return btoa(String.fromCharCode(...iv) + String.fromCharCode(...new Uint8Array(encrypted)));
}

export const decryptMessage = async (
    encryptedBase64: string,
    creatorId: string,
    userId: string
): Promise<MobileCaptchaScreenshotEventArgs | SocketIoMobileLoginStatusInput> => {
    const encryptedBuffer = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));

    const iv = encryptedBuffer.subarray(0, IV_LENGTH);
    const authTag = encryptedBuffer.subarray(encryptedBuffer.length - AUTH_TAG_LENGTH);
    const encryptedData = encryptedBuffer.subarray(IV_LENGTH, encryptedBuffer.length - AUTH_TAG_LENGTH);

    const key = await getCryptoKey(creatorId, userId);

    const encryptedWithTag = new Uint8Array(encryptedData.length + authTag.length);
    encryptedWithTag.set(encryptedData, 0);
    encryptedWithTag.set(authTag, encryptedData.length);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        {name: "AES-GCM", iv},
        key,
        encryptedWithTag
    );

    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    console.log("🔓 Decrypted Data:", decryptedText);

    const parsedData = JSON.parse(decryptedText);

    // 🔎 Use type guards to identify response type
    if ("image" in parsedData && "screenshotWidth" in parsedData) {
        return parsedData as MobileCaptchaScreenshotEventArgs;
    } else if ("status" in parsedData) {
        return parsedData as SocketIoMobileLoginStatusInput;
    }

    throw new Error("❌ Unknown decrypted data format");
};


