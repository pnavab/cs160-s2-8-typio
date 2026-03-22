import mongoose from 'mongoose'

/** Default: local MongoDB, database name `typio`. Override with `MONGODB_URI`. */
const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/typio'

export async function connectDb(): Promise<void> {
  if (mongoose.connection.readyState === 1) return
  await mongoose.connect(uri)
  console.log(`MongoDB connected: ${mongoose.connection.name}`)
}

export { mongoose }
