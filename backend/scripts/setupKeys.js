const readline = require('readline');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('=======================================================');
console.log('🔑 ZillaRoad Local API Key Configuration Tool');
console.log('🔒 Security Notice: Keys are stored exclusively on your local disk in .env');
console.log('=======================================================\n');

function promptKey(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function run() {
  try {
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    const geminiKey = await promptKey('1. Enter Gemini API Key (or press Enter to keep current/mock): ');
    const mapsKey = await promptKey('2. Enter Google Maps / Geocoding API Key (or press Enter to keep current): ');

    let lines = envContent ? envContent.split('\n') : [];

    function updateEnvVar(key, val) {
      if (!val) return;
      const index = lines.findIndex(l => l.startsWith(`${key}=`));
      if (index >= 0) {
        lines[index] = `${key}=${val}`;
      } else {
        lines.push(`${key}=${val}`);
      }
    }

    if (geminiKey) updateEnvVar('GEMINI_API_KEY', geminiKey);
    if (mapsKey) {
      updateEnvVar('GOOGLE_MAPS_API_KEY', mapsKey);
      updateEnvVar('GEOCODING_API_KEY', mapsKey);
    }

    fs.writeFileSync(envPath, lines.join('\n'));
    console.log('\n✅ Successfully updated backend/.env locally!');
    console.log('🚀 Restarting the backend server will activate live Google services.\n');
  } catch (err) {
    console.error('Error updating .env:', err);
  } finally {
    rl.close();
  }
}

run();
