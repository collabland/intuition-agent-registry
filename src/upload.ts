import { sync } from '@0xintuition/sdk';
import { intuitionConfig } from './setup.js';
import {
  isAlreadyExistsError,
  fetchJsonFromUri,
  isValidEIP8004,
  prepareERC8004ForSync,
} from './utils.js';

async function main() {
  const tokenUri = process.argv[2];
  if (!tokenUri) {
    throw new Error('Usage: tsx src/upload.ts <token_uri>');
  }

  console.log(`Fetching ERC8004 metadata from ${tokenUri}...`);
  
  try {
    const metadata = await fetchJsonFromUri(tokenUri);
    console.log('Metadata fetched successfully');

    const nftId = isValidEIP8004(metadata);
    
    if (!nftId) {
      throw new Error('Invalid ERC-8004 identity card: Metadata does not match ERC8004 specification');
    }

    console.log(`NFT ID extracted: ${nftId}`);

    console.log('Preparing data for sync (including A2A agent card fetch if available)...');
    const prepared = await prepareERC8004ForSync(metadata);

    // Construct sync data with NFT ID as subject
    const syncData: Record<string, Record<string, string | string[]>> = {
      [nftId]: prepared,
    };

    console.log('Syncing ERC8004 agent data to blockchain...');
    console.log(`  Token URI: ${tokenUri}`);
    console.log(`  NFT ID (subject): ${nftId}`);

    try {
      await sync(intuitionConfig, syncData);
      console.log('ERC8004 identity card processed and synced successfully');
    } catch (error: any) {
      if (isAlreadyExistsError(error)) {
        console.log('Idempotent no-op: ERC8004 identity card already synced');
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    const aborted = error?.name === "AbortError";
    if (aborted) {
      console.error('Error: Upstream timeout while fetching metadata');
    } else {
      console.error('Error:', error.message || 'Unknown error occurred');
    }
    throw error;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

