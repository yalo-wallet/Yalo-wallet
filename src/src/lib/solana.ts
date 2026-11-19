import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  type Commitment
} from "@solana/web3.js";

export type SolanaNetwork = "mainnet-beta" | "devnet";

/**
 * Generate a new Solana wallet locally.
 * The secret key must never be sent to the backend.
 */
export function createSolanaWallet() {
  const keypair = Keypair.generate();

  return {
    keypair,
    address: keypair.publicKey.toBase58()
  };
}

/**
 * Connect to Solana mainnet or devnet.
 */
export function createSolanaConnection(
  network: SolanaNetwork = "mainnet-beta",
  commitment: Commitment = "confirmed",
  rpcUrl?: string
): Connection {
  const endpoint = rpcUrl || clusterApiUrl(network);

  return new Connection(endpoint, commitment);
}

/**
 * Validate a Solana wallet address.
 */
export function isValidSolanaAddress(
  address: string
): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get SOL balance.
 */
export async function getSolanaBalance(
  address: string,
  connection: Connection
): Promise<number> {
  if (!isValidSolanaAddress(address)) {
    throw new Error("Invalid Solana wallet address.");
  }

  const publicKey = new PublicKey(address);

  const lamports = await connection.getBalance(publicKey);

  return lamports / 1_000_000_000;
}

/**
 * Get SOL balance in lamports.
 */
export async function getSolanaBalanceLamports(
  address: string,
  connection: Connection
): Promise<number> {
  if (!isValidSolanaAddress(address)) {
    throw new Error("Invalid Solana wallet address.");
  }

  return connection.getBalance(
    new PublicKey(address)
  );
}

/**
 * Get the latest Solana blockhash.
 */
export async function getLatestSolanaBlockhash(
  connection: Connection
) {
  return connection.getLatestBlockhash("confirmed");
}

/**
 * Get transaction details.
 */
export async function getSolanaTransaction(
  signature: string,
  connection: Connection
) {
  if (!signature.trim()) {
    throw new Error("Transaction signature is required.");
  }

  return connection.getParsedTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0
  });
}

/**
 * Get the current Solana network slot.
 */
export async function getSolanaSlot(
  connection: Connection
): Promise<number> {
  return connection.getSlot("confirmed");
}

/**
 * Check whether a transaction has been confirmed.
 */
export async function confirmSolanaTransaction(
  signature: string,
  connection: Connection
) {
  if (!signature.trim()) {
    throw new Error("Transaction signature is required.");
  }

  return connection.confirmTransaction(
    signature,
    "confirmed"
  );
    }
