// Generates 6-character alphanumeric room codes (e.g. "AB67CD")
// Excludes ambiguous chars (O, 0, I, 1, L) for whiteboard readability

const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
const MAX_RETRIES = 10

export function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return code
}

/**
 * Generates a code guaranteed unique against the database.
 * `codeExists` should query MongoDB and return true if the code is taken.
 */
export async function generateUniqueRoomCode(
  codeExists: (code: string) => Promise<boolean>,
): Promise<string> {
  for (let i = 0; i < MAX_RETRIES; i++) {
    const code = generateRoomCode()
    if (!(await codeExists(code))) return code
  }
  throw new Error(`Failed to generate unique room code after ${MAX_RETRIES} attempts`)
}
