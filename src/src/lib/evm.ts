import {
  createPublicClient,
  http,
  isAddress,
  formatEther,
  parseEther,
  type Address,
  type Chain,
  type PublicClient,
  type Hash
} from "viem";

import {
  mainnet,
  base,
  sepolia,
  baseSepolia
} from "viem/chains";

export type EVMNetwork =
  | "ethereum"
  | "base"
  | "ethereum-sepolia"
  | "base-sepolia";

const NETWORKS: Record<EVMNetwork, Chain> = {
  ethereum: mainnet,
  base,
  "ethereum-sepolia": sepolia,
  "base-sepolia": baseSepolia
};

/**
 * Get supported EVM network configuration.
 */
export function getEVMNetwork(
  network: EVMNetwork
): Chain {
  const selectedNetwork = NETWORKS[network];

  if (!selectedNetwork) {
    throw new Error("Unsupported EVM network.");
  }

  return selectedNetwork;
}

/**
 * Create a public RPC client.
 * Custom RPC URLs should come from secure configuration.
 */
export function createEVMClient(
  network: EVMNetwork,
  rpcUrl?: string
): PublicClient {
  const chain = getEVMNetwork(network);

  return createPublicClient({
    chain,
    transport: http(rpcUrl || chain.rpcUrls.default.http[0])
  });
}

/**
 * Validate an Ethereum-compatible address.
 */
export function isValidEVMAddress(
  address: string
): boolean {
  return isAddress(address);
}

/**
 * Normalize an EVM address.
 */
export function normalizeEVMAddress(
  address: string
): Address {
  if (!isValidEVMAddress(address)) {
    throw new Error("Invalid EVM wallet address.");
  }

  return address as Address;
}

/**
 * Get native coin balance.
 * ETH is used on Ethereum and Base.
 */
export async function getEVMBalance(
  address: string,
  client: PublicClient
): Promise<string> {
  const walletAddress = normalizeEVMAddress(address);

  const balance = await client.getBalance({
    address: walletAddress
  });

  return formatEther(balance);
}

/**
 * Get native coin balance in wei.
 */
export async function getEVMBalanceWei(
  address: string,
  client: PublicClient
): Promise<bigint> {
  const walletAddress = normalizeEVMAddress(address);

  return client.getBalance({
    address: walletAddress
  });
}

/**
 * Get the current chain ID.
 */
export async function getEVMChainId(
  client: PublicClient
): Promise<number> {
  return Number(await client.getChainId());
}

/**
 * Get the latest block number.
 */
export async function getEVMLatestBlock(
  client: PublicClient
): Promise<bigint> {
  return client.getBlockNumber();
}

/**
 * Get transaction details.
 */
export async function getEVMTransaction(
  hash: string,
  client: PublicClient
) {
  if (!/^0x([A-Fa-f0-9]{64})$/.test(hash)) {
    throw new Error("Invalid transaction hash.");
  }

  return client.getTransaction({
    hash: hash as Hash
  });
}

/**
 * Get transaction receipt and confirmation status.
 */
export async function getEVMTransactionReceipt(
  hash: string,
  client: PublicClient
) {
  if (!/^0x([A-Fa-f0-9]{64})$/.test(hash)) {
    throw new Error("Invalid transaction hash.");
  }

  return client.getTransactionReceipt({
    hash: hash as Hash
  });
}

/**
 * Estimate the gas required for a native transfer.
 * This does not send a transaction.
 */
export async function estimateEVMTransferGas(
  from: string,
  to: string,
  amount: string,
  client: PublicClient
): Promise<bigint> {
  const sender = normalizeEVMAddress(from);
  const recipient = normalizeEVMAddress(to);

  if (!amount.trim() || !Number.isFinite(Number(amount))) {
    throw new Error("Invalid transfer amount.");
  }

  if (Number(amount) <= 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }

  const value = parseEther(amount);

  return client.estimateGas({
    account: sender,
    to: recipient,
    value
  });
}

/**
 * Get the current gas price.
 */
export async function getEVMGasPrice(
  client: PublicClient
): Promise<bigint> {
  return client.getGasPrice();
}

/**
 * Get the current network block.
 */
export async function getEVMBlock(
  blockNumber: bigint,
  client: PublicClient
) {
  return client.getBlock({
    blockNumber
  });
}

/**
 * Check whether an EVM network is reachable.
 */
export async function checkEVMConnection(
  client: PublicClient
): Promise<boolean> {
  try {
    await client.getChainId();
    return true;
  } catch {
    return false;
  }
}
  
