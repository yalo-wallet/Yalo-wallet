import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { encryptVault, type EncryptedVault } from "./crypto";

export type WalletAddresses = {
  evmAddress: `0x${string}`;
  solanaAddress: string;
};

export type WalletBackup = {
  version: 1;
  addresses: WalletAddresses;
  encryptedVault: EncryptedVault;
};

/**
 * Creates a new EVM key locally and encrypts it before it is stored.
 * This helper does not create a Solana key or send secrets to a server.
 */
export async function createEvmWallet(
  vaultPassword: string
): Promise<WalletBackup> {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  try {
    const encryptedVault = await encryptVault(
      JSON.stringify({ evmPrivateKey: privateKey }),
      vaultPassword
    );

    return {
      version: 1,
      addresses: {
        evmAddress: account.address,
        solanaAddress: ""
      },
      encryptedVault
    };
  } finally {
    // Best-effort removal of the local string reference.
    // JavaScript strings cannot be reliably zeroized from memory.
  }
}

/**
 * Exports only public wallet addresses for account registration.
 * Never pass private keys, seed phrases, or vault passwords here.
 */
export function getPublicWalletData(
  backup: WalletBackup
): WalletAddresses {
  return {
    evmAddress: backup.addresses.evmAddress,
    solanaAddress: backup.addresses.solanaAddress
  };
}
