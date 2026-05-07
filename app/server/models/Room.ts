import { Schema, model } from 'mongoose'

export type RoomState = 'LOBBY' | 'COUNTDOWN' | 'RACING' | 'RESULTS' | 'CLOSED'

const playerSchema = new Schema(
  {
    socketId: { type: String, required: true },
    userId: { type: String },
    displayName: { type: String, required: true },
    isHost: { type: Boolean, default: false },
    isReady: { type: Boolean, default: false },
    isGuest: { type: Boolean, default: true },
  },
  { _id: false },
)

const roomSchema = new Schema(
  {
    roomCode: { type: String, required: true, unique: true, uppercase: true },
    hostSocketId: { type: String, default: '' },
    players: { type: [playerSchema], default: [] },
    state: {
      type: String,
      enum: ['LOBBY', 'COUNTDOWN', 'RACING', 'RESULTS', 'CLOSED'],
      default: 'LOBBY',
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    passageId: { type: String },
    maxPlayers: { type: Number, default: 6, min: 2, max: 10 },
  },
  { timestamps: true },
)

// auto-delete stale rooms after 1 hour
roomSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 })

export const Room = model('Room', roomSchema)
