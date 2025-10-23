import { search } from "@0xintuition/sdk";
import { account } from "./setup";

async function main() {
  // the search function takes an array of required key/value pairs
  // and an array of trusted account addresses

  console.log("Searching for quiz completions...");
  const result = await search([{ type: "quiz_completion" }], [account.address]);

  console.dir(result, { depth: 10 });

  // Uncomment below to search for agents instead
  // console.log('Searching for agents...')
  // const agentResult = await search([
  //   { type: 'agent' },
  //   { capabilities: 'web_search' },
  // ], [account.address])
  // console.dir(agentResult, { depth: 10 })
}

main().catch((e) => console.error(e));
