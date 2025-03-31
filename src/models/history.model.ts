import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const saveListeningHistory = async (
    userId: string,
    trackId: string,
    playedAt: Date,
    trackName: string,
    artistName: string,
    albumName: string,
    durationMs: number,
    source: string = "manual_upload",
    metadata: Record<string, any> = {}
) => {
    try {
        return await prisma.listeningHistory.create({
            data: {
                userId,
                trackId,
                playedAt,
                trackName,
                artistName,
                albumName,
                durationMs,
                source,
                metadata,
                uploaded: new Date(),
                
            }
        });
    } catch (error: any | unknown) {
        if (error.code === "P2002") {
            console.warn("Duplicate entry for trackId:", trackId);
            return null;
        }
        throw error;
    }
}