import { Schema, model } from 'mongoose'

const raceResultSchema = new Schema(
  {
    username: { type: String, required: true, index: true },
    wpm: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    placement: { type: Number, required: true },
    roomCode: { type: String, default: '' },
    difficulty: { type: String, default: 'Beginner' },
  },
  { timestamps: true },
)

export const RaceResult = model('RaceResult', raceResultSchema)
