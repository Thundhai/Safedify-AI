// First check health
const h = await fetch('https://safedifyagent.vercel.app/api/health', {
  headers: { 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  }
});
console.log('=== HEALTH ===');
console.log(JSON.stringify(await h.json(), null, 2));

// Then try login
console.log('\n=== LOGIN ===');
const res = await fetch('https://safedifyagent.vercel.app/api/auth/login', {
  method: 'POST',
  headers: { 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email: 'admin@safedify.com', password: 'admin123' })
});
console.log('Status:', res.status);
console.log(JSON.stringify(await res.json(), null, 2));
