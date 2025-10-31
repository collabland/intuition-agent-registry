import { search } from "@0xintuition/sdk";
import { account } from "./setup";
import { flattenToOneLevel } from "./utils.js";

async function main() {
  const url = process.argv[2];
  if (!url) {
    throw new Error("Usage: tsx src/query.ts <url>");
  }

  console.log(`Fetching JSON from ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }
  const payload = await response.json();

  const flattened = flattenToOneLevel(payload);

  // Convert flattened object to search criteria
  const criteria: Array<Record<string, string>> = [];
  for (const [key, value] of Object.entries(flattened)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        criteria.push({ [key]: typeof item === "string" ? item : String(item) });
      }
    } else if (typeof value === "string") {
      criteria.push({ [key]: value });
    } else {
      criteria.push({ [key]: String(value) });
    }
  }


  console.log("Searching with criteria...");
  const agentResult = await search(criteria, [account.address]);
  console.dir(agentResult, { depth: 10 });
}

main().catch((e) => console.error(e));


