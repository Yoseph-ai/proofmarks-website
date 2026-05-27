import { Client, PrivateKey, TopicCreateTransaction } from "@hashgraph/sdk";
import dotenv from 'dotenv';
dotenv.config();

async function createMainnetTopic() {
  const operatorId = process.env.MAINNET_OPERATOR_ID;
  const keyString = process.env.MAINNET_OPERATOR_KEY;

  if (!operatorId || !keyString) {
    throw new Error("Missing MAINNET_OPERATOR_ID or MAINNET_OPERATOR_KEY in .env");
  }

  // Parse the DER key exactly as in debug.js
  const operatorKey = PrivateKey.fromStringDer(keyString);

  const client = Client.forMainnet();
  client.setOperator(operatorId, operatorKey);

  console.log("🚀 Creating HCS topic on Hedera mainnet...");

  const transaction = new TopicCreateTransaction();
  const txResponse = await transaction.execute(client);
  const receipt = await txResponse.getReceipt(client);
  const topicId = receipt.topicId.toString();

  console.log(`✅ Topic created successfully!`);
  console.log(`📝 Topic ID: ${topicId}`);
  console.log(`\n🔧 Add this to your .env:\nMAINNET_TOPIC_ID=${topicId}`);
}

createMainnetTopic().catch(err => {
  console.error("❌ Failed to create topic:", err.message);
});
