import { findAtomIds, sync } from '@0xintuition/sdk';
import { intuitionConfig } from './setup';
import { flattenToOneLevel, normalizeFlatValues, isAlreadyExistsError } from './utils.js';
import { checkUrlExists, mintAgentIdentity } from './services/nft.js';

async function main() {
  const url = process.argv[2];
  if (!url) {
    throw new Error('Usage: tsx src/upload.ts <url>');
  }

  console.log(`Fetching JSON from ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }
  const payload = await response.json();

  const flattened = flattenToOneLevel(payload);

  // Check if URL already exists or mint new NFT (before normalizing)
  let nftId: string;
  const urlCheck = await checkUrlExists(url);

  if (urlCheck.exists && urlCheck.nftId) {
    nftId = urlCheck.nftId;
    console.log(`NFT ID already exists: ${nftId}`);
  } else {
    console.log(`Minting new NFT for agent card URL: ${url}`);
    const mintResult = await mintAgentIdentity(url);
    nftId = mintResult.nftId;
    console.log(`New NFT minted: ${nftId}`);
  }

  // Normalize after NFT check/mint
  const normalized: Record<string, string | string[]> = normalizeFlatValues(flattened);

  // Add required fields (order matches mother.ts)
  normalized['agent_card_url'] = url;
  normalized['https://schema.org/keywords'] = ['ipfs://QmRp1abVgPBgN5dSVfRsSpUWa8gUz5PhmSJMCLCSqDpvSP', 'ipfs://bafkreifdd5zbyg2k26bqftkdyjox52m6yx5ncgapkbt6pu3qqcu5wsktky'];

  const data: Record<string, Record<string, string | string[]>> = {
    [nftId]: normalized,
  };

  console.log('Syncing agent data from URL to blockchain...');
  console.log(`  Source URL: ${url}`);
  console.log(`  NFT ID (subject): ${nftId}`);

  try {
    await sync(intuitionConfig, data);
    console.log('Agent data fetched and synced successfully');
  } catch (error: any) {
    if (isAlreadyExistsError(error)) {
      console.log('Idempotent no-op: data already exists');
    } else {
      throw error;
    }
  }

  console.log('Finding atom ID for subject...');
  const atomIds = await findAtomIds([nftId]);

  if (atomIds.length === 0) {
    console.log('No atom ID found for subject');
    return;
  }

  console.log('Atom ID:', atomIds[0]);
  console.log('Done.');
}

main().catch((e) => console.error(e));


