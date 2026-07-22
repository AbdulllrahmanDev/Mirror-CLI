import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { classifyAsset, getCleanAssetPath, isTrackerOrAnalytics, resetFilenameCache } from './organizer.js';

const globalAssetMap = new Map();
const downloading = new Set();

function downloadFile(urlStr, destPath, retries = 3) {
  return new Promise((resolve) => {
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

    const attempt = (attemptsLeft) => {
      try {
        const u = new URL(urlStr);
        const isHttps = u.protocol === 'https:';
        const getFunc = isHttps ? https.get : http.get;

        const options = {
          hostname: u.hostname,
          path: u.pathname + u.search,
          port: u.port || (isHttps ? 443 : 80),
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
          },
          rejectUnauthorized: false,
          timeout: 20000
        };

        const req = getFunc(options, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            try {
              const redirectUrl = new URL(res.headers.location, urlStr).href;
              downloading.delete(urlStr);
              downloadFile(redirectUrl, destPath, retries).then(resolve);
            } catch {
              downloading.delete(urlStr);
              resolve(null);
            }
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
            } catch {
              downloading.delete(urlStr);
              resolve(null);
            }
          });
        });

        req.on('error', () => {
          if (attemptsLeft > 1) {
            setTimeout(() => attempt(attemptsLeft - 1), 500);
          } else {
            downloading.delete(urlStr);
            resolve(null);
          }
        });
        req.on('timeout', () => {
          req.destroy();
          if (attemptsLeft > 1) {
            setTimeout(() => attempt(attemptsLeft - 1), 500);
          } else {
            downloading.delete(urlStr);
            resolve(null);
          }
        });
      } catch {
        downloading.delete(urlStr);
        resolve(null);
      }
    };

    attempt(retries);
  });
}

async function runWithConcurrency(tasks, limit = 12) {
  const executing = new Set();
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(Array.from(executing));
}

function extractAssetUrls(html, baseUrl) {
  const urls = new Set();

  const srcRegex = /(?:src|href|content|poster|data-src)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = srcRegex.exec(html)) !== null) {
    try {
      const href = match[1].trim();
      if (!href || href.startsWith('data:') || href.startsWith('javascript:') || href.startsWith('#')) continue;
      const resolved = new URL(href, baseUrl).href;
      if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
        urls.add(resolved);
      }
    } catch { /* skip */ }
  }

  const srcsetRegex = /srcset\s*=\s*["']([^"']+)["']/gi;
  while ((match = srcsetRegex.exec(html)) !== null) {
    const parts = match[1].split(',');
    for (const part of parts) {
      const src = part.trim().split(/\s+/)[0];
      if (src && !src.startsWith('data:')) {
        try {
          const resolved = new URL(src, baseUrl).href;
          if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
            urls.add(resolved);
          }
        } catch { /* skip */ }
      }
    }
  }

  const cssUrlRegex = /url\((['"]?)([^'")]+)\1\)/gi;
  while ((match = cssUrlRegex.exec(html)) !== null) {
    try {
      const href = match[2].trim();
      if (!href || href.startsWith('data:')) continue;
      const resolved = new URL(href, baseUrl).href;
      if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
        urls.add(resolved);
      }
    } catch { /* skip */ }
  }

  return [...urls];
}

export async function downloadAssets(html, pageUrl, outputDir, options = {}) {
  const { verbose = false, keepAnalytics = false, capturedResponses = new Map() } = options;
  const pageAssetMap = new Map();

  // First: Save all captured responses from Puppeteer runtime execution
  for (const [assetUrl, buffer] of capturedResponses.entries()) {
    const category = classifyAsset(assetUrl);
    if (category === 'page') continue;

    if (!keepAnalytics && isTrackerOrAnalytics(assetUrl)) continue;

    if (!globalAssetMap.has(assetUrl)) {
      const cleanRelPath = getCleanAssetPath(assetUrl, category, outputDir);
      const localPath = path.join(outputDir, cleanRelPath);
      try {
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, buffer);
        globalAssetMap.set(assetUrl, cleanRelPath);

        if (category === 'css') {
          await processCssEmbeddedAssets(localPath, assetUrl, outputDir, options);
        }
      } catch { /* skip write error */ }
    }
    pageAssetMap.set(assetUrl, globalAssetMap.get(assetUrl));
  }

  // Second: Extract asset URLs from HTML DOM
  const urls = extractAssetUrls(html, pageUrl);

  const tasks = urls.map((assetUrl) => async () => {
    const category = classifyAsset(assetUrl);
    if (category === 'page') return;

    if (!keepAnalytics && isTrackerOrAnalytics(assetUrl)) {
      if (verbose) console.log(`  Filtered analytics/tracker: ${assetUrl}`);
      return;
    }

    if (globalAssetMap.has(assetUrl)) {
      pageAssetMap.set(assetUrl, globalAssetMap.get(assetUrl));
      return;
    }

    const cleanRelPath = getCleanAssetPath(assetUrl, category, outputDir);
    const localPath = path.join(outputDir, cleanRelPath);

    const result = await downloadFile(assetUrl, localPath);
    if (result) {
      globalAssetMap.set(assetUrl, cleanRelPath);
      pageAssetMap.set(assetUrl, cleanRelPath);

      if (category === 'css') {
        await processCssEmbeddedAssets(localPath, assetUrl, outputDir, options);
      }
    }
  });

  await runWithConcurrency(tasks, 12);
  return globalAssetMap;
}

async function processCssEmbeddedAssets(cssPath, cssUrl, outputDir, options) {
  try {
    if (!fs.existsSync(cssPath)) return;
    let cssContent = fs.readFileSync(cssPath, 'utf-8');
    const cssUrlRegex = /url\((['"]?)([^'")]+)\1\)/gi;

    let match;
    const embeddedUrls = new Set();
    while ((match = cssUrlRegex.exec(cssContent)) !== null) {
      const href = match[2].trim();
      if (!href || href.startsWith('data:')) continue;
      try {
        const resolved = new URL(href, cssUrl).href;
        if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
          embeddedUrls.add({ raw: href, resolved });
        }
      } catch { /* skip */ }
    }

    const cssDirFromRoot = path.dirname(path.relative(outputDir, cssPath)).replace(/\\/g, '/');

    for (const item of embeddedUrls) {
      let cleanRelPath = globalAssetMap.get(item.resolved);
      if (!cleanRelPath) {
        const category = classifyAsset(item.resolved);
        if (category === 'page') continue;

        cleanRelPath = getCleanAssetPath(item.resolved, category, outputDir);
        const localPath = path.join(outputDir, cleanRelPath);

        const result = await downloadFile(item.resolved, localPath);
        if (result) {
          globalAssetMap.set(item.resolved, cleanRelPath);
        } else {
          cleanRelPath = null;
        }
      }

      if (cleanRelPath) {
        let relFromCss = path.posix.relative(cssDirFromRoot, cleanRelPath);
        if (!relFromCss.startsWith('.')) relFromCss = './' + relFromCss;
        cssContent = cssContent.split(item.raw).join(relFromCss);
      }
    }

    fs.writeFileSync(cssPath, cssContent, 'utf-8');
  } catch { /* ignore */ }
}

export function resetDownloaderState() {
  globalAssetMap.clear();
  downloading.clear();
  resetFilenameCache();
}
