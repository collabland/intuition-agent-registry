import { API_URL_DEV, configureClient } from "@0xintuition/graphql";
import {
  // intuitionTestnet,
  getMultiVaultAddressFromChainId,
} from "@0xintuition/sdk";
import dotenv from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
dotenv.config();

// Set Base Sepolia GraphQL endpoint
configureClient({
  apiUrl: API_URL_DEV,
});

// This should be the logged in account (Metamask, etc)
// Read private key from environment variable
const privateKey = process.env.SIGNER;

if (!privateKey) {
  throw new Error(
    "SIGNER environment variable is required. Please add SIGNER=0x... to your .env file"
  );
}

if (!privateKey.startsWith("0x")) {
  throw new Error("SIGNER must be a valid hex private key starting with 0x");
}

export const account = privateKeyToAccount(privateKey as `0x${string}`);
console.log("Using account: ", account.address);

const intuitionTestnet = defineChain({
  id: 13579,
  name: "Intuition testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Test Trust",
    symbol: "tTRUST",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet.rpc.intuition.systems/http"],
      webSocket: ["wss://testnet.rpc.intuition.systems/ws"],
    },
  },
  blockExplorers: {
    default: {
      name: "Intuition Explorer",
      url: "https://testnet.explorer.intuition.systems",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
});

const baseSepoliaChain = baseSepolia;

const baseSepoliaWalletClient = createWalletClient({
  chain: baseSepoliaChain,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL),
  account: account
});

const baseSepoliaPublicClient = createPublicClient({
  chain: baseSepoliaChain,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL),
});

export const baseSepoliaConfig = {
  chain: baseSepoliaChain,
  walletClient: baseSepoliaWalletClient,
  publicClient: baseSepoliaPublicClient,
  chainId: baseSepoliaChain.id,
}

const walletClient = createWalletClient({
  chain: intuitionTestnet,
  transport: http(),
  account: account,
});

const publicClient = createPublicClient({
  chain: intuitionTestnet,
  transport: http(),
});

export const intuitionConfig: any = {
  walletClient,
  publicClient,
  address: getMultiVaultAddressFromChainId(intuitionTestnet.id),
};
