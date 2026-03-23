import { Schema, model } from 'mongoose'

const roomSchema = new Schema(
    {
        code:       { type: String, required: true, unique: true },
        passage:    { type: String, required: true },
        status:     { type: String, enum: ['waiting', 'in_progress', 'finished'], default: 'waiting' },
        maxPlayers: { type: Number, default: 4 },
        hostId:     { type: String, required: true },
        players: [
            {
                userId:   { type: String, required: true },
                username: { type: String, required: true },
                progress: { type: Number, default: 0 },
                wpm:      { type: Number, default: 0 },
                accuracy: { type: Number, default: 100 },
            },
        ],
    },
    { timestamps: true },
)

export const Room = model('Room', roomSchema)