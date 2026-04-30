import bcrypt from 'bcryptjs'
import { User } from '../models/User'
import { RaceResult } from '../models/RaceResult'

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

export type UpdateFields = {
  username?: string
  email?: string
  newPassword?: string
}

// Verifies currentPassword then applies any provided field updates
export async function updateUser(
  currentUsername: string,
  currentPassword: string,
  fields: UpdateFields,
): Promise<{ error: string } | { username: string; email: string }> {
  const user = await User.findOne({ username: currentUsername })
  if (!user) return { error: 'User not found' }

  const ok = await bcrypt.compare(currentPassword, user.password)
  if (!ok) return { error: 'Current password is incorrect' }

  const patch: Record<string, string> = {}

  if (fields.username && fields.username.trim() !== currentUsername) {
    const taken = await User.findOne({ username: fields.username.trim() })
    if (taken) return { error: 'Username is already taken' }
    patch.username = fields.username.trim()
  }

  if (fields.email && fields.email.trim().toLowerCase() !== user.email) {
    const taken = await User.findOne({ email: fields.email.trim().toLowerCase() })
    if (taken) return { error: 'An account with this email already exists' }
    patch.email = fields.email.trim().toLowerCase()
  }

  if (fields.newPassword) {
    if (fields.newPassword.length < 6) return { error: 'New password must be at least 6 characters' }
    patch.password = await bcrypt.hash(fields.newPassword, SALT_ROUNDS)
  }

  if (Object.keys(patch).length === 0) return { username: user.username, email: user.email }

  const updated = await User.findOneAndUpdate(
    { username: currentUsername },
    { $set: patch },
    { new: true },
  )
  if (!updated) return { error: 'Update failed' }

  // If username changed, migrate race history to the new username
  if (patch.username) {
    await RaceResult.updateMany({ username: currentUsername }, { $set: { username: patch.username } })
  }

  return { username: updated.username, email: updated.email }
}

// Deletes the user and all associated race results. Requires password confirmation
export async function deleteUserAndData(
  username: string,
  currentPassword: string,
): Promise<{ error: string } | { ok: true }> {
  const user = await User.findOne({ username })
  if (!user) return { error: 'User not found' }

  const ok = await bcrypt.compare(currentPassword, user.password)
  if (!ok) return { error: 'Password is incorrect' }

  await Promise.all([
    User.deleteOne({ username }),
    RaceResult.deleteMany({ username }),
  ])

  return { ok: true }
}
