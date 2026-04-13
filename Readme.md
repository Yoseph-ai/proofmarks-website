# Hedera Document Notary

Immutable proof of existence for any file, powered by the **Hedera Consensus Service**.

![Hedera](https://img.shields.io/badge/Hedera-Testnet-2D3748?logo=hedera)
![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)

## 🚀 Quick Start (Testnet)

### Prerequisites
- Node.js **18+**
- A free [Hedera Testnet account](https://portal.hedera.com/) (takes 30 seconds)

### 1. Clone & Install
```bash
git clone https://github.com/Yoseph-ai/hedera-document-auth.git
cd hedera-document-auth
npm install
2. Configure Environment
bash
cp .env.example .env
Open .env and fill in your Testnet credentials:

text
HEDERA_ACCOUNT_ID=0.0.xxxxxx
HEDERA_PRIVATE_KEY=302e...
HEDERA_NETWORK=testnet
HEDERA_TOPIC_ID=         # leave blank for now
3. Create an HCS Topic
bash
npm run topic:create
Copy the generated Topic ID and paste it into .env:

text
HEDERA_TOPIC_ID=0.0.xxxxxx
4. Run the App
bash
npm run dev
Open http://localhost:3000

🧪 Testing the Service
Timestamp a Document
Click "Timestamp a Document"

Upload any file (PDF, image, text)

You'll receive a certificate with:

SHA‑256 hash

Hedera Transaction ID (click to view on HashScan)

Consensus timestamp

Verify a Document
Click "Verify a Document"

Upload the exact same file

You'll see: ✅ Verified on Hedera

Try uploading a different file to see: ❌ Not found on the ledger

📦 Tech Stack
Next.js 15 – React framework

Hedera JavaScript SDK – HCS interactions

Tailwind CSS – Styling

shadcn/ui – Component primitives

🔒 Security Notes
Your .env file is never committed (listed in .gitignore)

All file hashing happens client‑side – your documents never leave your browser

Only the SHA‑256 hash is sent to Hedera

📄 License
ISC

Built by Yoseph Shibeshi

text

To use it:

1. Open your project in VS Code or any text editor.
2. Replace the contents of `README.md` (or `Readme.md`) with the block above.
3. Save the file.
4. Commit and push:

```powershell
git add README.md
git commit -m "Add comprehensive README for testers"
git push