/**
 * Basic Usage Examples for Agent Registry
 * 
 * This file demonstrates how to use the Agent Registry API
 * for common operations like registering and searching for agents.
 */

const API_BASE_URL = 'http://localhost:3000';

// Example 1: Register a new agent
async function registerAgent() {
  const agentData = {
    'did:example:myagent': {
      type: 'agent',
      name: 'My AI Assistant',
      description: 'A helpful AI assistant for various tasks',
      url: 'https://myagent.example.com/a2a',
      capabilities: ['web_search', 'file_search', 'defi']
    }
  };

  try {
    const response = await fetch(`${API_BASE_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agentData)
    });

    const result = await response.json();
    console.log('Agent registered:', result);
  } catch (error) {
    console.error('Error registering agent:', error);
  }
}

// Example 2: Search for agents
async function searchAgents() {
  const searchCriteria = {
    criteria: [
      { type: 'agent' },
      { capabilities: 'web_search' }
    ],
    trustedAccounts: ['0x1234567890abcdef...'] // Optional
  };

  try {
    const response = await fetch(`${API_BASE_URL}/agents/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(searchCriteria)
    });

    const result = await response.json();
    console.log('Search results:', result);
  } catch (error) {
    console.error('Error searching agents:', error);
  }
}

// Example 3: Health check
async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const result = await response.json();
    console.log('Health status:', result);
  } catch (error) {
    console.error('Health check failed:', error);
  }
}

// Example 4: Webhook integration
async function sendWebhookEvent() {
  const eventData = {
    type: 'quiz_completed',
    userAddress: '0x4917e853DC273da5F84362aB9f13eE49775B263c',
    communityId: '391378559945670667',
    metadata: {
      quizId: '3e961b41-e62d-4d8c-93ec-a18cb8a948ab',
      completedAt: '2025-10-12T20:49:17.000Z'
    },
    version: '1.0.0'
  };

  try {
    const response = await fetch(`${API_BASE_URL}/v1/intuition/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'your_api_key_here'
      },
      body: JSON.stringify(eventData)
    });

    const result = await response.json();
    console.log('Webhook response:', result);
  } catch (error) {
    console.error('Webhook error:', error);
  }
}

// Run examples
async function runExamples() {
  console.log('=== Agent Registry Examples ===\n');
  
  console.log('1. Health Check:');
  await checkHealth();
  
  console.log('\n2. Register Agent:');
  await registerAgent();
  
  console.log('\n3. Search Agents:');
  await searchAgents();
  
  console.log('\n4. Webhook Event:');
  await sendWebhookEvent();
}

// Export functions for use in other files
module.exports = {
  registerAgent,
  searchAgents,
  checkHealth,
  sendWebhookEvent,
  runExamples
};

// Run if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}
