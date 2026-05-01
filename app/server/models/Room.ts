import { Schema, model } from 'mongoose'

const playerSchema = new Schema({
  username: { type: String, required: true },
  ready: { type: Boolean, default: false },
})

const roomSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    host: { type: String, required: true },
    difficulty: { type: String, default: 'Beginner' },
    maxPlayers: { type: Number, default: 4 },
    status: { type: String, enum: ['waiting', 'racing'], default: 'waiting' },
    phraseIndex: { type: Number, default: 0 },
    players: [playerSchema],
  },
  { timestamps: true },
)

export const Room = model('Room', roomSchema)
