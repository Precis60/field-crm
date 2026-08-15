/**
 * Zero-knowledge crypto helpers for the password vault.
 *
 * Nothing here ever sends a plaintext secret or the master passphrase over
 * the network or to storage. The master passphrase only ever exists in
 * memory for the current tab, for as long as the vault is unlocked.
 *
 * - Key derivation: PBKDF2-SHA256, 300,000 iterations, per-vault random salt.
 * - Encryption: AES-GCM 256, random 12-byte IV per item.
 * - Everything stored server-side is base64: salt, IV, ciphertext.
 */

const PBKDF2_ITERATIONS = 300000;
const VERIFIER_PLAINTEXT = "vault-ok";

function toBase64(bytes) {
  let binary = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

function fromBase64(b64) {
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

function randomBytes(len) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return arr;
}

export function generateSalt() {
  return toBase64(randomBytes(16));
}

async function deriveKey(passphrase, saltB64) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromBase64(saltB64),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptString(key, plaintext) {
  const iv = randomBytes(12);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  return { iv: toBase64(iv), ciphertext: toBase64(ciphertext) };
}

async function decryptString(key, ivB64, ciphertextB64) {
  const dec = new TextDecoder();
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivB64) },
    key,
    fromBase64(ciphertextB64)
  );
  return dec.decode(plainBuf);
}

/** Creates a brand-new vault: a random salt plus an encrypted "verifier"
 * used later to check a passphrase is correct without ever storing it. */
export async function createVault(passphrase) {
  const salt = generateSalt();
  const key = await deriveKey(passphrase, salt);
  const { iv, ciphertext } = await encryptString(key, VERIFIER_PLAINTEXT);
  return { salt, verifier_iv: iv, verifier_ciphertext: ciphertext, key };
}

/** Attempts to unlock an existing vault. Returns the derived key on success,
 * or null if the passphrase is wrong (AES-GCM auth tag won't verify). */
export async function unlockVault(passphrase, config) {
  try {
    const key = await deriveKey(passphrase, config.salt);
    const result = await decryptString(key, config.verifier_iv, config.verifier_ciphertext);
    if (result !== VERIFIER_PLAINTEXT) return null;
    return key;
  } catch {
    return null;
  }
}

/** Encrypts an item's sensitive fields (everything except the title) as one
 * JSON blob. */
export async function encryptItem(key, { username, password, url, notes }) {
  const payload = JSON.stringify({ username: username || "", password: password || "", url: url || "", notes: notes || "" });
  return encryptString(key, payload);
}

export async function decryptItem(key, ivB64, ciphertextB64) {
  const json = await decryptString(key, ivB64, ciphertextB64);
  return JSON.parse(json);
}
