const crypto = require('crypto')
const os = require('os')

// Derive a machine-specific encryption key from hardware identifiers
// This means the encrypted data can only be decrypted on this machine
function getMachineKey() {
  const raw = `devpilot-${os.hostname()}-${os.userInfo().username}-${os.cpus()[0]?.model || 'cpu'}-${os.platform()}`
  return crypto.createHash('sha256').update(raw).digest()
}

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function encrypt(text) {
  if (!text) return ''
  const key = getMachineKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

function decrypt(encryptedText) {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText
  try {
    const key = getMachineKey()
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    // If decryption fails, the value might be plaintext (migration)
    return encryptedText
  }
}

module.exports = { encrypt, decrypt }
