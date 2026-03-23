import { Room } from '../models/Room'

const PASSAGES = [
    "The quick brown fox jumps over the lazy dog near the riverbank at dusk.",
    "Programming is the art of telling another human what one wants the computer to do.",
    "Simplicity is the ultimate sophistication, and great code reads like well-written prose.",
]

function pickPassage() {
    return PASSAGES[Math.floor(Math.random() * PASSAGES.length)]
}

async function generateUniqueCode(): Promise<string> {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    for (let attempt = 0; attempt < 10; attempt++) {
        const code = Array.from(
            { length: 6 },
            () => chars[Math.floor(Math.random() * chars.length)]
        ).join("")
        const exists = await Room.exists({ code })
        if (!exists) return code
    }
    throw new Error("Failed to generate a unique room code")
}

export async function createRoom(hostId: string, username: string, maxPlayers: number) {
    const doc = await Room.create({
        code: await generateUniqueCode(),
        passage: pickPassage(),
        status: 'waiting',
        maxPlayers,
        hostId,
        players: [{ userId: hostId, username, progress: 0, wpm: 0, accuracy: 100 }],
    })
    return doc
}

export async function findRoomByCode(code: string) {
    return Room.findOne({ code: code.toUpperCase() })
}

export async function findWaitingRooms() {
    return Room.find({ status: 'waiting' }).sort({ createdAt: -1 }).limit(20)
}