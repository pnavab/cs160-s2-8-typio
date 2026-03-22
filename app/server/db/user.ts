import bcrypt from 'bcryptjs'
import { User } from '../models/User'

const SALT_ROUNDS = 10

export async function createUser(
  username: string,
  email: string,
  password: string,
): Promise<{ id: string; username: string; email: string }> {
  const hashed = await bcrypt.hash(password, SALT_ROUNDS)
  const doc = await User.create({ username, email, password: hashed })
  return { id: doc._id.toString(), username: doc.username, email: doc.email }
}

export async function findUserByEmail(email: string) {
  return User.findOne({ email: email.toLowerCase().trim() })
}

export async function findUserByUsername(username: string) {
  return User.findOne({ username: username.trim() })
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed)
}
