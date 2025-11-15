import { readFileSync, writeFileSync, createWriteStream } from 'fs';
import { join } from 'path';

interface ConfigPubResult {
  [url: string]: any;
}

interface Statistics {
  case1: number; // Successfully fetched config
  case2: number; // Invalid access link (redirected)
  case3: number; // Timeout (504)
  other: number; // Other errors
  totalAdded: number; // Total entries in JSON
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

// Extract URL from "Invalid Access Link" response
function extractRedirectUrl(description: string): string | null {
  const urlMatch = description.match(/https?:\/\/[^\s]+/);
  return urlMatch ? urlMatch[0] : null;
}

// Extract base URL from a full URL (removes /config_pub.json and trailing slashes)
function extractBaseUrl(url: string): string {
  return url.replace(/\/config_pub\.json$/, '').replace(/\/$/, '');
}

// Fetch config_pub.json from a URL
async function fetchConfigPub(url: string, timeout: number = 45000): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': url.replace('/config_pub.json', ''),
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
    });

    clearTimeout(timeoutId);

    if (response.status === 504) {
      return { error: 'timeout', status: 504 };
    }

    // Get response text first to handle both JSON and HTML
    const responseText = await response.text();
    
    // Try to parse as JSON first (many servers return JSON even with wrong Content-Type)
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      // If parsing fails, check if it's HTML (node not started page)
      const trimmedText = responseText.trim();
      
      // Check if it looks like HTML
      if (trimmedText.startsWith('<!DOCTYPE') || trimmedText.startsWith('<html') || trimmedText.startsWith('<!')) {
        // Check for Cloudflare challenge page
        if (trimmedText.includes('Just a moment...') || trimmedText.includes('cf-browser-verification') || trimmedText.includes('challenges.cloudflare.com')) {
          return { error: 'cloudflare_challenge', message: 'Cloudflare bot protection challenge page detected' };
        }
        
        // Check if it might actually be JSON embedded in HTML comments or similar
        // Some servers might return HTML with JSON inside
        const jsonMatch = trimmedText.match(/\{[\s\S]*"title"[\s\S]*"Invalid Access Link"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            data = JSON.parse(jsonMatch[0]);
            // If we successfully parsed embedded JSON, continue with normal flow
          } catch (e) {
            // Still couldn't parse, treat as HTML
            return { error: 'html_response', message: 'Node not started or returned HTML page', debug: trimmedText.substring(0, 200) };
          }
        } else {
          return { error: 'html_response', message: 'Node not started or returned HTML page', debug: trimmedText.substring(0, 200) };
        }
      } else {
        // Not valid JSON or HTML, return error with more context
        return { error: 'invalid_json', message: 'Response is not valid JSON', rawText: trimmedText.substring(0, 200) };
      }
    }

    // Check if it's an "Invalid Access Link" response
    if (data.title === 'Invalid Access Link' && data.description) {
      const redirectUrl = extractRedirectUrl(data.description);
      if (redirectUrl) {
        // Try fetching from the redirect URL (with new timeout)
        const redirectConfigUrl = `${redirectUrl.replace(/\/$/, '')}/config_pub.json`;
        const redirectController = new AbortController();
        const redirectTimeoutId = setTimeout(() => redirectController.abort(), timeout);
        
        try {
          const redirectResponse = await fetch(redirectConfigUrl, {
            signal: redirectController.signal,
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': redirectUrl.replace(/\/$/, ''),
              'Connection': 'keep-alive',
              'Sec-Fetch-Dest': 'empty',
              'Sec-Fetch-Mode': 'cors',
              'Sec-Fetch-Site': 'same-origin',
            },
          });

          clearTimeout(redirectTimeoutId);

          if (redirectResponse.status === 504) {
            return { error: 'timeout', status: 504 };
          }

          if (redirectResponse.ok) {
            const redirectText = await redirectResponse.text();
            try {
              const redirectData = JSON.parse(redirectText);
              return { success: true, data: redirectData, originalUrl: url, redirectUrl: redirectConfigUrl };
            } catch (parseError) {
              return { error: 'redirect_failed', message: 'Redirect response is not valid JSON' };
            }
          } else {
            return { error: 'redirect_failed', status: redirectResponse.status };
          }
        } catch (err: any) {
          clearTimeout(redirectTimeoutId);
          if (err.name === 'AbortError') {
            return { error: 'timeout', status: 504 };
          }
          return { error: 'redirect_error', message: err.message };
        }
      }
      return { error: 'invalid_access_link', data };
    }

    // Check if it's a valid config (has expected fields)
    if (data.address || data.chat || data.domain) {
      return { success: true, data };
    }

    return { error: 'unknown_response', data };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { error: 'timeout', status: 504 };
    }
    return { error: 'fetch_error', message: err.message };
  }
}

// Process a single URL
async function processUrl(baseUrl: string, stats: Statistics, results: ConfigPubResult): Promise<void> {
  // Clean up the URL (remove quotes, trailing slash, add /config_pub.json)
  const cleanUrl = baseUrl.replace(/^["']|["']$/g, '').replace(/\/$/, '');
  const configUrl = `${cleanUrl}/config_pub.json`;

  try {
    const result = await fetchConfigPub(configUrl);

    if (result.success) {
      // Determine the working URL (key): use redirect if available, otherwise use original
      const workingUrl = result.redirectUrl 
        ? extractBaseUrl(result.redirectUrl)  // Use redirect if available
        : cleanUrl;                            // Use original if no redirect
      
      // Check if this working URL already exists (duplicate endpoint)
      if (results[workingUrl]) {
        log(`⏭️  Skipping duplicate working URL: ${workingUrl} | Original: ${configUrl}${result.redirectUrl ? ` → Redirect: ${result.redirectUrl}` : ''}`);
        stats.case2++;
        return;
      }
      
      // Add new unique endpoint entry
      // Note: workingUrl is the key, so we don't need to store accessibleBaseUrl in the config
      results[workingUrl] = { ...result.data };
      
      if (result.redirectUrl) {
        // Case 2: Successfully fetched via redirect
        stats.case2++;
        stats.totalAdded++;
        log(`🔄 [Case 2] Redirected from ${configUrl} to ${result.redirectUrl} → Working URL: ${workingUrl}`);
      } else {
        // Case 1: Successfully fetched config directly
        stats.case1++;
        stats.totalAdded++;
        log(`✅ [Case 1] ${configUrl} → Working URL: ${workingUrl}`);
      }
    } else if (result.error === 'timeout' || result.status === 504) {
      // Case 3: Timeout
      stats.case3++;
      log(`⏱️  [Case 3] Timeout: ${configUrl}`);
    } else if (result.error === 'invalid_access_link' || result.error === 'redirect_failed' || result.error === 'redirect_error') {
      // Case 2: Invalid access link but redirect failed
      stats.case2++;
      log(`🔄 [Case 2] Invalid access link (redirect failed): ${configUrl}`);
    } else if (result.error === 'cloudflare_challenge') {
      // Cloudflare bot protection challenge
      stats.other++;
      log(`🛡️  [Cloudflare] Bot protection challenge detected: ${configUrl} - ${result.message}`);
    } else {
      // Other errors
      stats.other++;
      const debugInfo = result.debug ? ` | Debug: ${result.debug}` : '';
      const rawTextInfo = result.rawText ? ` | Raw: ${result.rawText}` : '';
      log(`❌ [Other] ${result.error}: ${configUrl} - ${result.message || JSON.stringify(result.data)}${debugInfo}${rawTextInfo}`);
    }
  } catch (err: any) {
    stats.other++;
    log(`❌ [Error] ${configUrl}: ${err.message}`);
  }
}

// Process URLs concurrently in batches with delay between batches
async function processBatch(urls: string[], stats: Statistics, results: ConfigPubResult): Promise<void> {
  const concurrency = 3; // Process 5 URLs concurrently
  const delayBetweenBatches = 8000; // 5 seconds delay between batches

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const urlNumber = i + 1;
    const totalUrls = urls.length;
    const batchEnd = Math.min(i + concurrency, urls.length);
    const batchNumber = Math.floor(i / concurrency) + 1;
    const totalBatches = Math.ceil(urls.length / concurrency);

    log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (URLs ${urlNumber}-${batchEnd}/${totalUrls}, ${batch.length} concurrent)...`);

    // Process batch concurrently - wait for all to complete
    await Promise.all(batch.map(url => processUrl(url, stats, results)));

    // Wait before next batch (except for the last batch)
    if (i + concurrency < urls.length) {
      log(`⏳ Waiting ${delayBetweenBatches / 1000} seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
}

// Main function
async function main() {
  const csvPath = join(process.cwd(), 'online-node-urls.csv');
  // const csvPath = join(process.cwd(), 'test-urls.csv');
  const outputPath = join(process.cwd(), 'config_pub_results.json');
  const logPath = join(process.cwd(), 'fetchConfigPub.log');

  // Initialize log stream
  logStream = createWriteStream(logPath, { flags: 'w' });

  log('🚀 Starting config_pub.json fetcher...\n');
  log(`📖 Reading URLs from: ${csvPath}`);

  // Read and parse CSV
  const csvContent = readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim() && !line.startsWith('"Node URL"'));
  const urls = lines.map(line => line.trim()).filter(line => line.length > 0);

  log(`📊 Found ${urls.length} URLs to process\n`);

  const stats: Statistics = {
    case1: 0,
    case2: 0,
    case3: 0,
    other: 0,
    totalAdded: 0,
  };

  const results: ConfigPubResult = {};

  // Process all URLs
  await processBatch(urls, stats, results);

  // Save results to JSON file
  writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');

  // Print summary
  log('\n' + '='.repeat(60));
  log('📈 SUMMARY');
  log('='.repeat(60));
  log(`✅ Case 1 (Success): ${stats.case1}`);
  log(`🔄 Case 2 (Invalid Access Link): ${stats.case2}`);
  log(`⏱️  Case 3 (Timeout): ${stats.case3}`);
  log(`❌ Other Errors: ${stats.other}`);
  log(`📝 Total Entries Added: ${stats.totalAdded}`);
  log(`💾 Results saved to: ${outputPath}`);
  log(`📋 Log file saved to: ${logPath}`);
  log('='.repeat(60));

  // Close log stream
  if (logStream) {
    logStream.end();
  }
}

// Run the script
main().catch(err => {
  const errorMsg = `💥 Fatal error: ${err}`;
  console.error(errorMsg);
  if (logStream) {
    logStream.write(`[${new Date().toISOString()}] ${errorMsg}\n`);
    logStream.end();
  }
  process.exit(1);
});

