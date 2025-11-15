import { readFileSync, writeFileSync, createWriteStream } from 'fs';
import { join } from 'path';
import { PinataSDK } from 'pinata';
import 'dotenv/config';

interface ConfigPub {
  address: string;
  chat_name?: string;
  description: string;
  // accessibleBaseUrl removed - the key in ConfigPubResults is the working URL
  [key: string]: any;
}

interface ConfigPubResults {
  [workingUrl: string]: ConfigPub;  // Key is the working URL (accessible endpoint)
}

interface AgentCard {
  protocolVersion: string;
  name: string;
  description: string;
  url: string;
  preferredTransport: string;
  version: string;
  capabilities: Record<string, never>;
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: never[];
}

interface PinataUrls {
  [workingUrl: string]: string; // workingUrl -> pinata_url
}

// Logging function (will be initialized in main)
let logStream: ReturnType<typeof createWriteStream> | null = null;

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  if (logStream) {
    logStream.write(logMessage);
  }
}

// Convert config to AgentCard format
function configToAgentCard(workingUrl: string, config: ConfigPub): AgentCard {
  const name = config.chat_name || config.description || 'GaiaNet Inference Service';
  const description = config.description || 'GaiaNet node inference service';  
  // Use workingUrl directly (it's the key in config_pub_results.json)
  const url = `${workingUrl}/v1/chat/completions`;

  return {
    protocolVersion: '0.3.0',
    name,
    description,
    url,
    preferredTransport: 'HTTP+JSON',
    version: '1.0.0',
    capabilities: {},
    defaultInputModes: ['application/json'],
    defaultOutputModes: ['application/json'],
    skills: [],
  };
}

// Upload AgentCard to Pinata
async function uploadToPinata(
  pinata: PinataSDK,
  agentCard: AgentCard,
  workingUrl: string
): Promise<string | null> {
  try {
    // Convert JSON to File object (Node.js 20+ has native File/Blob support)
    const jsonString = JSON.stringify(agentCard, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    // Use a sanitized version of the URL for the filename
    const sanitizedUrl = workingUrl.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${sanitizedUrl}-agent-card.json`;
    const file = new File([blob], fileName, {
      type: 'application/json',
    });

    // Upload to Pinata
    const upload = await pinata.upload.public.file(file);

    // Convert CID to IPFS URL
    const ipfsUrl = `ipfs://${upload.cid}`;
    log(`✅ Uploaded ${workingUrl} → ${ipfsUrl}`);
    return ipfsUrl;
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    log(`❌ Failed to upload ${workingUrl}: ${errorMessage}`);
    return null;
  }
}

// Process batch of uploads
async function processBatch(
  pinata: PinataSDK,
  batch: Array<{ workingUrl: string; agentCard: AgentCard }>,
  results: PinataUrls
): Promise<void> {
  const promises = batch.map(({ workingUrl, agentCard }) =>
    uploadToPinata(pinata, agentCard, workingUrl).then((ipfsUrl) => {
      if (ipfsUrl) {
        results[workingUrl] = ipfsUrl;
      }
      return { workingUrl, success: !!ipfsUrl };
    })
  );

  await Promise.all(promises);
}

// Sleep function for rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const logPath = join(process.cwd(), 'generateAgentCards.log');
  logStream = createWriteStream(logPath, { flags: 'w' });

  log('🚀 Starting AgentCard generation and Pinata upload...\n');

  // Validate environment variables
  const pinataJwt = process.env.PINATA_JWT;
  const pinataGateway = process.env.PINATA_GATEWAY;

  if (!pinataJwt) {
    throw new Error('PINATA_JWT environment variable is required');
  }
  if (!pinataGateway) {
    throw new Error('PINATA_GATEWAY environment variable is required');
  }

  // Initialize Pinata SDK
  const pinata = new PinataSDK({
    pinataJwt,
    pinataGateway,
  });

  log('✅ Pinata SDK initialized\n');

  // Read config_pub_results.json
  const configPath = join(process.cwd(), 'config_pub_results.json');
  log(`Reading config from: ${configPath}`);
  const configData = readFileSync(configPath, 'utf-8');
  const configs: ConfigPubResults = JSON.parse(configData);

  const workingUrls = Object.keys(configs);
  const total = workingUrls.length;
  log(`Found ${total} config entries to process\n`);

  // Convert all configs to AgentCards
  // workingUrl is the key from config_pub_results.json
  const agentCards: Array<{ workingUrl: string; agentCard: AgentCard }> = [];
  for (const workingUrl of workingUrls) {
    const config = configs[workingUrl];
    const agentCard = configToAgentCard(workingUrl, config);
    agentCards.push({ workingUrl, agentCard });
  }

  log(`Generated ${agentCards.length} AgentCards\n`);

  // Process in batches of 3 with 1 second delay
  const batchSize = 3;
  const results: PinataUrls = {};
  let processed = 0;
  let successful = 0;
  let failed = 0;

  log(`Processing ${total} uploads in batches of ${batchSize}...\n`);

  for (let i = 0; i < agentCards.length; i += batchSize) {
    const batch = agentCards.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(agentCards.length / batchSize);

    log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} items)`);

    await processBatch(pinata, batch, results);

    processed += batch.length;
    const batchSuccessful = batch.filter((item) => results[item.workingUrl]).length;
    const batchFailed = batch.length - batchSuccessful;
    successful += batchSuccessful;
    failed += batchFailed;

    log(
      `   Progress: ${processed}/${total} | Success: ${successful} | Failed: ${failed}\n`
    );

    // Add delay between batches (except for the last batch)
    if (i + batchSize < agentCards.length) {
      await sleep(1000);
    }
  }

  // Save results to JSON file
  const outputPath = join(process.cwd(), 'gaia_agent_card_pinata_urls.json');
  writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');

  log('\n📊 Summary:');
  log(`   Total processed: ${processed}`);
  log(`   Successful: ${successful}`);
  log(`   Failed: ${failed}`);
  log(`   Results saved to: ${outputPath}`);

  // Log failed workingUrls for manual retry
  if (failed > 0) {
    const failedUrls = agentCards
      .filter((item) => !results[item.workingUrl])
      .map((item) => item.workingUrl);
    log('\n❌ Failed workingUrls (for manual retry):');
    for (const workingUrl of failedUrls) {
      log(`   ${workingUrl}`);
    }
  }

  log('\n✅ Done!');
}

main().catch((error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  log(`\n❌ Fatal error: ${errorMessage}`);
  console.error(error);
  process.exit(1);
});

