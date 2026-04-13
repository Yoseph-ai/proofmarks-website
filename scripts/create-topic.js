// scripts/create-topic.js
import { createTopic, setTopicId } from '../src/lib/hederaService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    console.log('🔧 Creating a new HCS Topic for Document Authentication...\n');
    const topicId = await createTopic();
    setTopicId(topicId);
    console.log(`\n✅ Topic created: ${topicId}`);

    // Optionally append to .env file
    const envPath = path.join(__dirname, '..', '.env');
    const envLine = `HEDERA_TOPIC_ID=${topicId}`;

    try {
        let envContent = fs.readFileSync(envPath, 'utf8');
        if (!envContent.includes('HEDERA_TOPIC_ID=')) {
            fs.appendFileSync(envPath, `\n${envLine}\n`);
            console.log(`📝 Added ${envLine} to .env`);
        } else {
            console.log('ℹ️ HEDERA_TOPIC_ID already exists in .env. Please update it manually if needed.');
        }
    } catch (err) {
        console.log(`⚠️ Could not update .env automatically. Please add this line manually:\n${envLine}`);
    }
}

run().catch(console.error);