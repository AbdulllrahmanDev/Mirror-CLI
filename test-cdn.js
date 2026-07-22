import https from 'https';

const url = 'https://cdn.prod.website-files.com/69b4c4d6440a41424df382bf/css/adoxstudio.webflow.shared.20af53cb0.min.css';

https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*'
  }
}, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', res.headers);
  let size = 0;
  res.on('data', chunk => size += chunk.length);
  res.on('end', () => console.log('TOTAL BYTES:', size));
}).on('error', err => console.error('ERROR:', err));
