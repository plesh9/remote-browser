export const getCryptoKey = (creatorId: string, userId: string): string => {
    return `key_${creatorId}_${userId}`;
};
