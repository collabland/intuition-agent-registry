import { sync } from '@0xintuition/sdk'
import { config } from './setup'

async function main() {

  // Sample data
  // did:example:123 - can be any identifier, for example - ethereum address
  // key / value pairs currently supported only one level deep (no nested objects)


  const data = {
    'did:example:789test': {
      type: 'agent',
      "https://schema.org/keywords": "ipfs://QmRp1abVgPBgN5dSVfRsSpUWa8gUz5PhmSJMCLCSqDpvSP",
      name: 'Claude',
      description: 'Your ultimate ai assistant',
      url: 'https://agent.example.com/a2a',
      capabilities: [
        'web_search',
        // 'defi',
      ]
    },
  }

  // the sync function will check for existing data, and will try to create
  // missing atoms / triples in two transactions

  console.log('Syncing data...')
  await sync(config, data)
  console.log('Done.')

}

main().catch(e => console.error(e))


