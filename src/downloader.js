import fs from 'fs';
import path from 'path';
import { get } from 'https';
import { URL } from 'url';

const assetMap = new Map();
const downloading = new Set();

function urlToLocalPath(assetUrl, baseDir) {
  const u = new URL(assetUrl);
  let filePath = u.pathname;
  if (filePath.endsWith('/') || !filePath.includes('.')) {
    filePath = path.join(filePath, 'index.html');
  }
  const fullPath = path.join(baseDir, decodeURIComponent(filePath));
  return fullPath;
}

function downloadFile(urlStr, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath)) {
      resolve(destPath);
      return;
    }
    if (downloading.has(urlStr)) {
      resolve(destPath);
      return;
    }
    downloading.add(urlStr);

    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    const u = new URL(urlStr);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      port: 443,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      rejectUnauthorized: false,
      timeout: 15000
    };

    const req = get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, urlStr).href;
        downloading.delete(urlStr);
        downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        downloading.delete(urlStr);
        resolve(null);
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          fs.writeFileSync(destPath, Buffer.concat(chunks));
          downloading.delete(urlStr);
          resolve(destPath);
        } catch (err) {
          downloading.delete(urlStr);
          resolve(null);
        }
      });
    });

    req.on('error', () => {
      downloading.delete(urlStr);
      resolve(null);
    });
    req.on('timeout', () => {
      req.destroy();
      downloading.delete(urlStr);
      resolve(null);
    });
  });
}

function extractAssetUrls(html, baseUrl) {
  const urls = new Set();
  const base = new URL(baseUrl);

  const srcRegex = /(?:src|href|content|poster|srcset)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = srcRegex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], baseUrl).href;
      if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
        urls.add(resolved);
      }
    } catch { /* skip invalid */ }
  }

  const cssUrlRegex = /url\(["']?([^"')]+)["']?\)/gi;
  while ((match = cssUrlRegex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], baseUrl).href;
      if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
        urls.add(resolved);
      }
    } catch { /* skip invalid */ }
  }

  return [...urls];
}

export async function downloadAssets(html, pageUrl, assetsDir, verbose = false) {
  const pageAssetMap = new Map();
  const urls = extractAssetUrls(html, pageUrl);

  const tasks = urls.map(async (assetUrl) => {
    if (assetMap.has(assetUrl)) {
      pageAssetMap.set(assetUrl, assetMap.get(assetUrl));
      return;
    }

    try {
      const localPath = urlToLocalPath(assetUrl, assetsDir);
      const result = await downloadFile(assetUrl, localPath);
      if (result) {
        const relativePath = path.relative(path.resolve(assetsDir, '..'), localPath).replace(/\\/g, '/');
        assetMap.set(assetUrl, relativePath);
        pageAssetMap.set(assetUrl, relativePath);
      }
    } catch (err) {
      if (verbose) console.error(`  Asset failed: ${assetUrl}`);
    }
  });

  await Promise.allSettled(tasks);
  return pageAssetMap;
}
