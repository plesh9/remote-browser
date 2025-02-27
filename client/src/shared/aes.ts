const IV_LENGTH = 12;

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

export const decryptMessage = async (encryptedMessage: string, creatorId: string, userId: string): Promise<any> => {
    const encryptedBuffer = Uint8Array.from(atob(encryptedMessage), (c) => c.charCodeAt(0));

    const iv = encryptedBuffer.subarray(0, IV_LENGTH);
    const data = encryptedBuffer.subarray(IV_LENGTH);

    const key = await getCryptoKey(creatorId, userId);
    const decrypted = await window.crypto.subtle.decrypt({name: "AES-GCM", iv}, key, data);

    return JSON.parse(new TextDecoder().decode(decrypted));
}
