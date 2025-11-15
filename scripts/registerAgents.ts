import { readFileSync, writeFileSync, createWriteStream } from 'fs';
import { join } from 'path';
import 'dotenv/config';

interface PinataUrls {
  [workingUrl: string]: string; // workingUrl -> pinata_url
}

interface RegisteredAgents {
  [workingUrl: string]: string; // workingUrl -> pinata_url (already registered)
}

interface RegistrationResult {
  ipfsUrl: string;
  success: boolean;
  nftId?: string;
  error?: string;
}

// Logging function
let logStream: ReturnType<typeof createWriteStream> | null = null;

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  if (logStream) {
    logStream.write(logMessage);
  }
}

// Register a single agent with the deployed API
async function registerAgent(
  apiUrl: string,
  apiKey: string,
  ipfsUrl: string
): Promise<RegistrationResult> {
  try {
    const response = await fetch(`${apiUrl}/v1/mother/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'x-api-key': apiKey,
      },
      body: ipfsUrl, // Send raw URL as text/plain
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      return {
        ipfsUrl,
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const result = await response.json();
    return {
      ipfsUrl,
      success: true,
      nftId: result.nftId,
    };
  } catch (error: any) {
    return {
      ipfsUrl,
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

async function main() {
  const logPath = join(process.cwd(), 'registerAgents.log');
  logStream = createWriteStream(logPath, { flags: 'w' });

  log('🚀 Starting agent registration with deployed API...\n');

  // Validate environment variables
  const apiUrl = 'https://intuition-api-server-95212c85846d.herokuapp.com';
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error('API_KEY environment variable is required');
  }

  log(`🌐 API URL: ${apiUrl}`);
  log(`🔑 API Key: ${apiKey.substring(0, 8)}...\n`);

  // Read Pinata URLs file
  const pinataUrlsPath = join(process.cwd(), 'gaia_agent_card_pinata_urls.json');
  log(`Reading agent cards from: ${pinataUrlsPath}`);
  
  const pinataUrlsData = readFileSync(pinataUrlsPath, 'utf-8');
  const pinataUrls: PinataUrls = JSON.parse(pinataUrlsData);

  log(`Found ${Object.keys(pinataUrls).length} total agents\n`);

  // Read already registered agents file (if it exists)
  const registeredAgentsPath = join(process.cwd(), 'registered_agents.json');
  let registeredAgents: RegisteredAgents = {};
  
  try {
    const registeredData = readFileSync(registeredAgentsPath, 'utf-8');
    registeredAgents = JSON.parse(registeredData);
    log(`📋 Found ${Object.keys(registeredAgents).length} already registered agents`);
    log(`⏭️  Filtering out already registered agents...\n`);
  } catch (error) {
    log('📋 No existing registered_agents.json found - starting fresh\n');
  }

  // Filter out already registered agents
  const entriesToRegister = Object.entries(pinataUrls).filter(
    ([workingUrl, ipfsUrl]) => {
      // Check if this workingUrl/IPFS URL combination is already registered
      return registeredAgents[workingUrl] !== ipfsUrl;
    }
  );

  if (entriesToRegister.length === 0) {
    log('✅ All agents are already registered! Nothing to do.\n');
    if (logStream) {
      logStream.end();
    }
    return;
  }

  log(`📝 Found ${entriesToRegister.length} agents to register (filtered out ${Object.keys(pinataUrls).length - entriesToRegister.length} already registered)\n`);

  let successful = 0;
  let failed = 0;
  let processed = 0;

  // Process agents sequentially (one at a time)
  for (const [workingUrl, ipfsUrl] of entriesToRegister) {
    processed++;
    log(`\n📦 Processing ${processed}/${entriesToRegister.length}: ${workingUrl}`);
    log(`   IPFS URL: ${ipfsUrl}`);

    const result = await registerAgent(apiUrl, apiKey, ipfsUrl);

    if (result.success) {
      successful++;
      log(`✅ Successfully registered → NFT ID: ${result.nftId}`);
      
      // Write to registered agents file immediately after success
      registeredAgents[workingUrl] = ipfsUrl;
      writeFileSync(
        registeredAgentsPath,
        JSON.stringify(registeredAgents, null, 2),
        'utf-8'
      );
      log(`💾 Saved to registered_agents.json`);
    } else {
      failed++;
      log(`❌ Failed: ${result.error}`);
    }

    // Add a small delay between requests to avoid overwhelming the API
    if (processed < entriesToRegister.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
    }
  }

  // Print summary
  log('\n' + '='.repeat(60));
  log('📈 SUMMARY');
  log('='.repeat(60));
  log(`✅ Successful: ${successful}`);
  log(`❌ Failed: ${failed}`);
  log(`📝 Total Processed: ${processed}`);
  log(`📋 Log file saved to: ${logPath}`);
  log(`💾 Registered agents saved to: ${registeredAgentsPath}`);
  log('='.repeat(60));

  // Log failed agents for manual retry
  if (failed > 0) {
    log('\n❌ Failed agents (for manual retry):');
    // We'd need to track failures separately to log them here
    // For now, check the log file for details
  }

  log('\n✅ Done!');

  // Close log stream
  if (logStream) {
    logStream.end();
  }
}

main().catch((error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  log(`\n❌ Fatal error: ${errorMessage}`);
  console.error(error);
  if (logStream) {
    logStream.end();
  }
  process.exit(1);
});

