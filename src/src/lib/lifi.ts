
import {
  createConfig,
  getQuote,
  getRoutes,
  getStatus,
  ChainId,
  type Quote,
  type RoutesRequest,
  type Route,
  type StatusResponse
} from "@lifi/sdk";

let lifiInitialized = false;

/**
 * Initialize LI.FI SDK.
 * Public configuration only. Never put private keys here.
 */
export function initializeLiFi(): void {
  if (lifiInitialized) return;

  createConfig({
    integrator: "yalo-wallet",
    providers: []
  });

  lifiInitialized = true;
}

/**
 * Supported networks.
 */
export const LIFI_CHAINS = {
  ethereum: ChainId.ETH,
  base: ChainId.BAS,
  solana: ChainId.SOL
} as const;

export type LiFiNetwork = keyof typeof LIFI_CHAINS;

/**
 * Convert supported network name to LI.FI chain ID.
 */
export function getLiFiChainId(
  network: LiFiNetwork
): number {
  const chainId = LIFI_CHAINS[network];

  if (!chainId) {
    throw new Error("Unsupported network.");
  }

  return chainId;
}

/**
 * Validate a wallet address.
 */
function validateAddress(address: string): void {
  if (!address || !address.trim()) {
    throw new Error("Wallet address is required.");
  }
}

/**
 * Get a quote for a token swap.
 * Amount must be supplied in the token's smallest unit.
 */
export async function getLiFiQuote(params: {
  fromChain: LiFiNetwork;
  toChain: LiFiNetwork;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress?: string;
}): Promise<Quote> {
  initializeLiFi();

  validateAddress(params.fromAddress);

  if (params.toAddress) {
    validateAddress(params.toAddress);
  }

  if (!/^[0-9]+$/.test(params.fromAmount)) {
    throw new Error("Invalid token amount.");
  }

  if (BigInt(params.fromAmount) <= 0n) {
    throw new Error("Amount must be greater than zero.");
  }

  if (!params.fromToken || !params.toToken) {
    throw new Error("Token addresses are required.");
  }

  return getQuote({
    fromChain: getLiFiChainId(params.fromChain),
    toChain: getLiFiChainId(params.toChain),
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
    toAddress: params.toAddress || params.fromAddress
  });
}

/**
 * Find available swap routes.
 */
export async function getLiFiRoutes(
  request: RoutesRequest
): Promise<Route[]> {
  initializeLiFi();

  const result = await getRoutes(request);

  return result.routes;
}

/**
 * Check the status of a submitted swap transaction.
 */
export async function getLiFiStatus(params: {
  txHash: string;
  fromChain: LiFiNetwork;
  toChain: LiFiNetwork;
  bridge: string;
}): Promise<StatusResponse> {
  initializeLiFi();

  if (!params.txHash.trim()) {
    throw new Error("Transaction hash is required.");
  }

  if (!params.bridge.trim()) {
    throw new Error("Bridge name is required.");
  }

  return getStatus({
    txHash: params.txHash,
    fromChain: getLiFiChainId(params.fromChain),
    toChain: getLiFiChainId(params.toChain),
    bridge: params.bridge
  });
}

/**
 * Check whether LI.FI is reachable.
 */
export async function checkLiFiConnection(): Promise<boolean> {
  try {
    initializeLiFi();

    await getRoutes({
      fromChainId: ChainId.ETH,
      toChainId: ChainId.BAS,
      fromTokenAddress: "0x0000000000000000000000000000000000000000",
      toTokenAddress: "0x0000000000000000000000000000000000000000",
      fromAmount: "1000000000000000",
      fromAddress: "0x0000000000000000000000000000000000000001"
    });

    return true;
  } catch {
    return false;
  }
}
