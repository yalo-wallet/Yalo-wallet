const PBKDF2_ITERATIONS = 310_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

export type EncryptedVault = {
  version: 1;
  algorithm: "AES-GCM";
  kdf: "PBKDF2-SHA-256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
};

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveVaultKey(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  if (!password || password.length < 12) {
    throw new Error("Vault password must be at least 12 characters.");
  }

  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations,
      hash: "SHA-256"
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts wallet-secret data locally in the user's browser.
 * Never send the plaintext or password to the server.
 */
export async function encryptVault(
  plaintext: string,
  password: string
): Promise<EncryptedVault> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure browser encryption is not available.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveVaultKey(password, salt, PBKDF2_ITERATIONS);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );

  return {
    version: 1,
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA-256",
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encrypted))
  };
}

/**
 * Decrypts a vault only on the user's device.
 * A wrong password or modified ciphertext causes decryption to fail.
 */
export async function decryptVault(
  vault: EncryptedVault,
  password: string
): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure browser encryption is not available.");
  }

  if (
    vault.version !== 1 ||
    vault.algorithm !== "AES-GCM" ||
    vault.kdf !== "PBKDF2-SHA-256" ||
    !Number.isInteger(vault.iterations) ||
    vault.iterations < 100_000 ||
    vault.iterations > 2_000_000
  ) {
    throw new Error("Unsupported or invalid encrypted vault format.");
  }

  const salt = fromBase64(vault.salt);
  const iv = fromBase64(vault.iv);
  const ciphertext = fromBase64(vault.ciphertext);

  if (salt.length !== SALT_LENGTH || iv.length !== IV_LENGTH) {
    throw new Error("Invalid encrypted vault data.");
  }

  const key = await deriveVaultKey(password, salt, vault.iterations);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}
