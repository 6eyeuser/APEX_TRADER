// scripts/tunnel.mjs
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// 1. Manually load variables from your .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#\s]+)\s*=\s*(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  });
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ Error: TELEGRAM_BOT_TOKEN not found in .env file.");
  process.exit(1);
}

console.log("🚀 Starting Pinggy Tunnel...");

// 2. Spawn the Pinggy SSH command
const tunnel = spawn('ssh', [
  '-p', '443', 
  '-R0:localhost:3000', 
  '-o', 'StrictHostKeyChecking=no', 
  'free@a.pinggy.io'
]);

let webhookSet = false;

// 3. Listen to the terminal output to catch the generated URL
const handleOutput = async (data) => {
  const output = data.toString();
  process.stdout.write(output); // Print Pinggy's normal output to your terminal

  if (!webhookSet) {
    // Regex to catch the dynamic free.pinggy.net URL
    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.free\.pinggy\.net/);
    
    if (match) {
      webhookSet = true; // Prevent it from triggering twice
      const tunnelUrl = match[0];
      const webhookUrl = `${tunnelUrl}/api/auth/webhook`;
      
      console.log(`\n🔗 Captured Pinggy URL: ${tunnelUrl}`);
      console.log(`🤖 Auto-registering Telegram Webhook...`);
      
      try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${webhookUrl}`);
        const json = await res.json();
        
        if (json.ok) {
          console.log(`✅ Webhook successfully bound to Telegram! Your bot is ready to trade.`);
        } else {
          console.error(`❌ Telegram API Error:`, json.description);
        }
      } catch (err) {
        console.error(`❌ Failed to set webhook:`, err.message);
      }
    }
  }
};

tunnel.stdout.on('data', handleOutput);
// SSH often prints connection banners to stderr instead of stdout
tunnel.stderr.on('data', handleOutput); 

tunnel.on('close', (code) => {
  console.log(`Tunnel closed with code ${code}`);
});