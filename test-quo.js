const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

try {
  const envPath = path.join(__dirname, '.env.local');
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} catch (e) {}

async function start() {
  const phoneId = process.env.QUO_PHONE_NUMBER_ID;
  const apiKey = process.env.QUO_API_KEY;
  
  if (!phoneId || !apiKey) {
    console.log('No keys');
    return;
  }

  const url = `https://api.openphone.com/v1/messages?phoneNumberId=${phoneId}&participants[]=%2B17015815526`;
  const res = await fetch(url, { headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' } });
  const data = await res.json();
  
  if (data.data && data.data.length > 0) {
     console.log(JSON.stringify(data.data[0], null, 2));
  } else {
     console.log(data);
  }
}
start();
