import { ethers } from "ethers";
import { search, getAtomDetails, globalSearch } from "@0xintuition/sdk";
import { sepoliaConfig, account } from "../setup.js";


// Contract ABI - minimal interface for register function
// We'll need to determine which register() function to use
const AGENT_IDENTITY_ABI = [
  // Function to register agent (returns token ID)
  // Note: We need to check which of the 3 register() functions to use
  "function register() external returns (uint256)",
  // Alternative signatures if needed:
  // "function register(address) external returns (uint256)",
  // "function register(string) external returns (uint256)",
] as const;

/**
 * Format NFT identifier as chainId:contractAddress:tokenId
 */
export function formatNftIdentifier(
  chainId: number | string,
  contractAddress: string,
  tokenId: number | string
): string {
  return `${chainId}:${contractAddress}:${tokenId}`;
}

/**
 * Parse NFT identifier string into components
 */
export function parseNftIdentifier(
  nftId: string
): { chainId: string; contractAddress: string; tokenId: string } | null {
  const parts = nftId.split(":");
  if (parts.length !== 3) {
    return null;
  }
  return {
    chainId: parts[0],
    contractAddress: parts[1],
    tokenId: parts[2],
  };
}

/**
 * Check if string is a valid NFT identifier format
 */
export function isNftIdentifier(str: string): boolean {
  return parseNftIdentifier(str) !== null;
}

/**
 * Validate NFT identifier format
 */
export function validateNftIdentifier(nftId: string): boolean {
  const parsed = parseNftIdentifier(nftId);
  if (!parsed) return false;
  
  // Validate contract address format
  if (!ethers.isAddress(parsed.contractAddress)) return false;
  
  // Validate token ID is a number
  if (isNaN(Number(parsed.tokenId))) return false;
  
  return true;
}

/**
 * Check if agent card URL already exists in Intuition
 * Returns existing NFT ID if found, null otherwise
 */
export async function checkUrlExists(
  url: string
): Promise<{ exists: boolean; nftId?: string; subject?: string }> {
  try {
    const result = await search([{ agent_card_url: url }], [account.address]);
    const subject = Object.keys(result)[0];

    if (!subject) {
      return { exists: false };
    }

    if (isNftIdentifier(subject)) {
      return { exists: true, nftId: subject };
    }

    return { exists: false };
  } catch (error) {
    console.error("Error checking URL existence:", error);
    return { exists: false };
  }
}

/**
 * Extract token ID from transaction receipt
 * Looks for Transfer event with mint (from address 0x000...)
 */
export function extractTokenIdFromReceipt(
  receipt: ethers.TransactionReceipt
): string | null {
  try {
    // ERC-721 Transfer event: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
    const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    
    for (const log of receipt.logs) {
      // Check if this is a Transfer event
      if (log.topics[0] === transferEventSignature && log.topics.length === 4) {
        // topics[1] = from (indexed)
        // topics[2] = to (indexed)
        // topics[3] = tokenId (indexed)
        const from = ethers.getAddress("0x" + log.topics[1].slice(-40));
        const tokenId = BigInt(log.topics[3]);
        
        // Check if this is a mint (from address is 0x000...)
        if (from === ethers.ZeroAddress) {
          return tokenId.toString();
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error extracting token ID from receipt:", error);
    return null;
  }
}

/**
 * Mint Agent Identity NFT on Base Sepolia
 * Returns NFT identifier in format: chainId:contractAddress:tokenId
 */
export async function mintAgentIdentity(
  url: string
): Promise<{
  chainId: string;
  contractAddress: string;
  tokenId: string;
  nftId: string;
  transactionHash: string;
}> {
  const contractAddress = process.env.AGENT_IDENTITY_CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    throw new Error("AGENT_IDENTITY_CONTRACT_ADDRESS not set in environment variables");
  }

  if (!ethers.isAddress(contractAddress)) {
    throw new Error(`Invalid contract address: ${contractAddress}`);
  }

  // Create provider from sepoliaConfig
  // Note: We need to convert viem wallet to ethers provider
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Get signer from private key
  const privateKey = process.env.SIGNER;
  if (!privateKey) {
    throw new Error("SIGNER not set in environment variables");
  }
  const signer = new ethers.Wallet(privateKey, provider);

  // Create contract instance
  const contract = new ethers.Contract(contractAddress, AGENT_IDENTITY_ABI, signer);

  // Call register() function
  // Note: We may need to determine which register() function to use
  console.log(`Minting NFT for agent card URL: ${url}`);
  console.log(`Contract: ${contractAddress}`);
  
  const tx = await contract.register();
  console.log(`Transaction hash: ${tx.hash}`);
  
  // Wait for transaction receipt
  const receipt = await tx.wait();
  console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

  // Extract token ID from receipt
  const tokenId = extractTokenIdFromReceipt(receipt);
  
  if (!tokenId) {
    throw new Error("Failed to extract token ID from transaction receipt");
  }

  const chainId = sepoliaConfig.chainId.toString();
  const nftId = formatNftIdentifier(chainId, contractAddress, tokenId);

  console.log(`NFT minted successfully: ${nftId}`);

  return {
    chainId,
    contractAddress,
    tokenId,
    nftId,
    transactionHash: tx.hash,
  };
}

