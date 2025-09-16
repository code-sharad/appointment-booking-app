import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const secretKey = process.env.ENCRYPTION_SECRET || crypto.randomBytes(32).toString('hex');
const key = typeof secretKey === 'string' ?
  crypto.createHash('sha256').update(secretKey).digest() :
  secretKey;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedData: string): string {
  try {
    const [ivHex, encrypted] = encryptedData.split(':');

    if (!ivHex || !encrypted) {
      throw new Error('Invalid encrypted data format - missing IV or encrypted content');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
