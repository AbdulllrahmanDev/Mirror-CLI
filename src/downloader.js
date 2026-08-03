import fs from 'fs';
import path from 'path';
import { get } from 'https';
import { URL } from 'url';
import crypto from 'crypto';

const globalAssetMap = new Map();
const downloading = new Set();
const filenameCache = new Map();

export function resetFilenameCache() {
  filenameCache.clear();
}

export function registerAssetInMap(assetUrl, cleanRelPath) {
  if (!assetUrl || !cleanRelPath) return;
  const formattedRel = cleanRelPath.replace(/\\/g, '/');
  globalAssetMap.set(assetUrl, formattedRel);
  try {
    const u = new URL(assetUrl);
    globalAssetMap.set(u.pathname, formattedRel);
    globalAssetMap.set(u.pathname.replace(/^\//, ''), formattedRel);
    const cleanPathWithoutQuery = u.origin + u.pathname;
    globalAssetMap.set(cleanPathWithoutQuery, formattedRel);
    const basename = path.basename(u.pathname);
    if (basename && basename.includes('.')) {
      if (!globalAssetMap.has(basename)) {
        globalAssetMap.set(basename, formattedRel);
      }
    }
  } catch { /* skip */ }
}

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

    const attempt = (attemptsLeft) => {
      try {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });

        const u = new URL(urlStr);
        const options = {
          hostname: u.hostname,
          path: u.pathname + u.search,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
          },
          rejectUnauthorized: false,
          timeout: 15000
        };

        const req = get(options, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            try {
              const redirectUrl = new URL(res.headers.location, urlStr).href;
              downloading.delete(urlStr);
              downloadFile(redirectUrl, destPath, attemptsLeft - 1).then(resolve);
              return;
            } catch {
              downloading.delete(urlStr);
              resolve(null);
              return;
            }
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

function classifyAsset(urlStr) {
  try {
    const u = new URL(urlStr);
    const pathname = u.pathname.toLowerCase();
    if (pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|avif|bmp)$/)) return 'img';
    if (pathname.match(/\.(css)$/)) return 'css';
    if (pathname.match(/\.(js|mjs|cjs)$/)) return 'js';
    if (pathname.match(/\.(woff|woff2|ttf|eot|otf)$/)) return 'font';
    if (pathname.match(/\.(html|htm|php|asp|aspx)$/) || pathname.endsWith('/')) return 'page';
    return 'other';
  } catch {
    return 'other';
  }
}

function isTrackerOrAnalytics(urlStr) {
  const trackers = [
    'google-analytics.com', 'googletagmanager.com', 'analytics.js',
    'gtag/js', 'facebook.net', 'connect.facebook.net', 'pixel.js',
    'hotjar.com', 'mixpanel.com', 'segment.io', 'doubleclick.net'
  ];
  return trackers.some(t => urlStr.includes(t));
}

function getCleanAssetPath(urlStr, category, outputDir) {
  if (filenameCache.has(urlStr)) {
    return filenameCache.get(urlStr);
  }

  try {
    const u = new URL(urlStr);
    let pathname = u.pathname;

    let relPath = '';
    if (pathname.startsWith('/assets/')) {
      relPath = pathname.substring(1);
    } else {
      const subDirs = {
        img: 'assets/images',
        css: 'assets/css',
        js: 'assets/js',
        font: 'assets/fonts',
        other: 'assets/misc'
      };

      let basename = path.basename(pathname);
      if (!basename || basename === '/' || !basename.includes('.')) {
        const ext = category === 'css' ? '.css' : category === 'js' ? '.js' : category === 'img' ? '.png' : '.bin';
        basename = `asset_${crypto.createHash('md5').update(urlStr).digest('hex').slice(0, 8)}${ext}`;
      }
      basename = basename.replace(/[<>:"/\\|?*]/g, '_');

      const targetSubDir = subDirs[category] || 'assets/misc';
      relPath = path.join(targetSubDir, basename).replace(/\\/g, '/');
    }

    let counter = 1;
    const nameWithoutExt = path.parse(relPath).name;
    const dirName = path.dirname(relPath);
    const ext = path.parse(relPath).ext;

    let candidate = relPath;
    while (fs.existsSync(path.join(outputDir, candidate)) && filenameCache.get(urlStr) !== candidate && counter < 1000) {
      candidate = path.join(dirName, `${nameWithoutExt}_${counter}${ext}`).replace(/\\/g, '/');
      counter++;
    }

    filenameCache.set(urlStr, candidate);
    return candidate;
  } catch {
    const fallback = `assets/misc/asset_${Date.now()}.bin`;
    filenameCache.set(urlStr, fallback);
    return fallback;
  }
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

  const srcRegex = /(?:src|href|content|poster|data-src|data-href)\s*=\s*["']([^"']+)["']/gi;
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

export async function downloadAssets(html, pageUrl, outputDir, capturedResponses = new Map(), verbose = false, onProgress = null) {
  // 1. Save all Puppeteer captured responses (dynamic JS chunks, Vite/Next.js/Webpack bundles, CSS, fonts)
  if (capturedResponses && capturedResponses.size > 0) {
    for (const [urlStr, buffer] of capturedResponses.entries()) {
      if (isTrackerOrAnalytics(urlStr)) continue;
      const category = classifyAsset(urlStr);
      if (category === 'page') continue;

      const cleanRelPath = getCleanAssetPath(urlStr, category, outputDir);
      const localPath = path.join(outputDir, cleanRelPath);
      try {
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        if (!fs.existsSync(localPath)) {
          fs.writeFileSync(localPath, buffer);
        }
        registerAssetInMap(urlStr, cleanRelPath);
      } catch { /* skip */ }
    }
  }

  // 2. Process all extracted asset URLs from static HTML
  const urls = extractAssetUrls(html, pageUrl);
  let completedCount = 0;

  const tasks = urls.map((assetUrl) => async () => {
    const category = classifyAsset(assetUrl);
    if (category === 'page' || isTrackerOrAnalytics(assetUrl)) {
      completedCount++;
      return;
    }

    if (globalAssetMap.has(assetUrl)) {
      completedCount++;
      if (onProgress) onProgress(assetUrl, completedCount, urls.length);
      return;
    }

    const cleanRelPath = getCleanAssetPath(assetUrl, category, outputDir);
    const localPath = path.join(outputDir, cleanRelPath);

    const result = await downloadFile(assetUrl, localPath);
    if (result || fs.existsSync(localPath)) {
      registerAssetInMap(assetUrl, cleanRelPath);
    }
    completedCount++;
    if (onProgress) onProgress(assetUrl, completedCount, urls.length);
  });

  await runWithConcurrency(tasks, 12);
  return globalAssetMap;
}

export function resetDownloaderState() {
  globalAssetMap.clear();
  downloading.clear();
  resetFilenameCache();
}

export function getAssetCategoryTelemetry(assetsDir) {
  const categories = {
    images: { count: 0, size: 0, icon: '-', name: 'Images' },
    stylesheets: { count: 0, size: 0, icon: '-', name: 'Stylesheets' },
    scripts: { count: 0, size: 0, icon: '-', name: 'Scripts' },
    fonts: { count: 0, size: 0, icon: '-', name: 'Fonts' },
    other: { count: 0, size: 0, icon: '-', name: 'Other Assets' }
  };

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const size = fs.statSync(fullPath).size;
        const ext = path.extname(entry.name).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.avif', '.bmp'].includes(ext)) {
          categories.images.count++;
          categories.images.size += size;
        } else if (['.css'].includes(ext)) {
          categories.stylesheets.count++;
          categories.stylesheets.size += size;
        } else if (['.js', '.mjs', '.cjs'].includes(ext)) {
          categories.scripts.count++;
          categories.scripts.size += size;
        } else if (['.woff', '.woff2', '.ttf', '.eot', '.otf'].includes(ext)) {
          categories.fonts.count++;
          categories.fonts.size += size;
        } else {
          categories.other.count++;
          categories.other.size += size;
        }
      }
    }
  }

  walk(assetsDir);
  return categories;
}
