/**
 * Hachage de mot de passe StageTrack — crypto.scrypt natif Node.js.
 * ---------------------------------------------------------------
 * Format stocké en base : "scrypt:<saltHex>:<hashHex>"
 * (salt aléatoire de 16 octets, clé dérivée de 64 octets, N=16384).
 * Compatible avec tous les points de création de comptes :
 * seeds, inscription, création de Chef par la Direction, réinitialisations.
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/** Hache un mot de passe en clair au format "scrypt:<saltHex>:<hashHex>". */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(plain, salt, KEY_LENGTH);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

/**
 * Vérifie un mot de passe en clair contre un hash stocké.
 * Supports défensifs : format inconnu / hash corrompu → false (jamais d'exception).
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  try {
    const salt = Buffer.from(parts[1], "hex");
    const expected = Buffer.from(parts[2], "hex");
    const derived = await scrypt(plain, salt, expected.length || KEY_LENGTH);
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
