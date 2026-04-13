# Hedera Document Notary

Immutable proof of existence for any file, powered by the Hedera Consensus Service.

## 🚀 Quick Start (Testnet)

### Prerequisites
- Node.js 18+
- A Hedera Testnet account (get one free at [portal.hedera.com](https://portal.hedera.com))

### Setup
1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your Testnet credentials
3. Install dependencies: `npm install`
4. Create an HCS Topic: `npm run topic:create`
5. Add the generated Topic ID to your `.env`
6. Run the dev server: `npm run dev`
7. Open http://localhost:3000

## 🧪 Testing
- Timestamp a file and share the HashScan link with a friend.
- Have them verify the same file to prove it hasn't been tampered with.

## 📦 Tech Stack
- Next.js 15
- Hedera JavaScript SDK
- Tailwind CSS

## 📄 License
ISC