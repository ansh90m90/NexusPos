import http from 'http';
import https from 'https';

https.get('https://ais-dev-7zumfgylrh2tb6btfdbws4-344656878526.asia-east1.run.app/Login.tsx', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const lines = data.split('\n');
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
  });
}).on('error', (err) => {
  console.error(err);
});
