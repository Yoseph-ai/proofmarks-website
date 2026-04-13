// scripts/test-hedera.js
import { createTopic, submitHash, verifyHash, setTopicId, getTopicId, testConnection } from '../src/lib/hederaService.js';
import { createHash } from 'crypto';

async function runTest() {
    console.log('🧪 Testing Hedera Document Authentication Service\n');

    // 1. Test connection
    console.log('1️⃣ Testing connection to Hedera...');
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ Connection failed. Check your .env and network.');
        process.exit(1);
    }

    // 2. Create a topic if not already set
    let topicId = getTopicId();
    if (!topicId) {
        console.log('\n2️⃣ No topic found. Creating a new HCS topic...');
        topicId = await createTopic();
        setTopicId(topicId);
        console.log(`   📝 Add this to your .env: HEDERA_TOPIC_ID=${topicId}`);
    } else {
        console.log(`\n2️⃣ Using existing topic: ${topicId}`);
    }

    // 3. Submit a test hash
    const testData = `Test document ${Date.now()}`;
    const testHash = createHash('sha256').update(testData).digest('hex');
    console.log(`\n3️⃣ Submitting test hash: ${testHash}`);

    const submitResult = await submitHash(testHash);
    console.log('   ✅ Submitted:', submitResult);

    // 4. Wait a few seconds for mirror node propagation
    console.log('\n4️⃣ Waiting 5 seconds for Mirror Node propagation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 5. Verify the hash
    console.log('\n5️⃣ Verifying the hash...');
    const verifyResult = await verifyHash(testHash);
    if (verifyResult.exists) {
        console.log(`   ✅ Hash found! Timestamp: ${verifyResult.timestamp}`);
    } else {
        console.log('   ❌ Hash not found. (May need more propagation time)');
    }

    console.log('\n🎉 Test completed.');
}

runTest().catch(console.error);