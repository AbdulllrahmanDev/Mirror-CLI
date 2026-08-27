import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
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

async function downloadFile(urlStr, destPath, retries = 3) {
  if (fs.existsSync(destPath)) return destPath;
  if (downloading.has(urlStr)) return destPath;
  downloading.add(urlStr);

  try {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    // 1. Try modern native fetch (handles HTTP/2, TLS, Brotli/Gzip, and redirects automatically)
    try {
      const res = await fetch(urlStr, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*'
        },
        signal: AbortSignal.timeout(15000)
      });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        fs.writeFileSync(destPath, Buffer.from(arrayBuf));
        downloading.delete(urlStr);
        return destPath;
      }
    } catch { /* fallback to http/https get */ }

    // 2. Fallback to https / http module
    const u = new URL(urlStr);
    const client = u.protocol === 'http:' ? http : https;
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      port: u.port || (u.protocol === 'http:' ? 80 : 443),
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
      },
      rejectUnauthorized: false,
      timeout: 15000
    };

    const buffer = await new Promise((resolve) => {
      const req = client.get(options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          try {
            const redirectUrl = new URL(res.headers.location, urlStr).href;
            downloading.delete(urlStr);
            downloadFile(redirectUrl, destPath, retries - 1).then(resolve);
            return;
          } catch {
            resolve(null);
            return;
          }
        }
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });

    if (buffer) {
      fs.writeFileSync(destPath, buffer);
      downloading.delete(urlStr);
      return destPath;
    }
  } catch {
    // skip
  } finally {
    downloading.delete(urlStr);
  }
  return null;
}

function classifyAsset(urlStr) {
  try {
    const u = new URL(urlStr);
    const pathname = u.pathname.toLowerCase();
    const search = u.search.toLowerCase();

    // Images
    if (
      pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|avif|bmp|tiff)$/) ||
      search.includes('format=') ||
      search.includes('image') ||
      pathname.includes('/image') ||
      pathname.includes('/img') ||
      pathname.includes('/photos/') ||
      pathname.includes('/wp-content/uploads/') ||
      u.hostname.includes('unsplash.com') ||
      u.hostname.includes('cloudinary.com') ||
      u.hostname.includes('imgix.net') ||
      u.hostname.includes('shopify.com')
    ) {
      return 'img';
    }

    // Stylesheets
    if (pathname.match(/\.(css)$/) || search.includes('css')) return 'css';

    // JavaScript
    if (pathname.match(/\.(js|mjs|cjs)$/)) return 'js';

    // Fonts
    if (pathname.match(/\.(woff|woff2|ttf|eot|otf)$/) || search.includes('font')) return 'font';

    // 3D Models & Audio / Video
    if (pathname.match(/\.(glb|gltf|bin|hdr|obj|fbx|wasm|mp4|webm|mov|mp3|wav|ogg)$/)) return 'other';

    // HTML Pages
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
        let ext = '.bin';
        if (category === 'img') {
          if (urlStr.includes('.webp') || urlStr.includes('format=webp')) ext = '.webp';
          else if (urlStr.includes('.svg') || urlStr.includes('image/svg')) ext = '.svg';
          else if (urlStr.includes('.png') || urlStr.includes('format=png')) ext = '.png';
          else if (urlStr.includes('.avif') || urlStr.includes('format=avif')) ext = '.avif';
          else ext = '.jpg';
        } else if (category === 'css') {
          ext = '.css';
        } else if (category === 'js') {
          ext = '.js';
        } else if (category === 'font') {
          ext = '.woff2';
        }
        basename = `asset_${crypto.createHash('md5').update(urlStr).digest('hex').slice(0, 8)}${ext}`;
      }
      basename = basename.replace(/[<>:"/\\|?*]/g, '_');

      const targetSubDir = subDirs[category] || 'assets/misc';
      relPath = path.join(targetSubDir, basename).replace(/\\/g, '/');
    }

    const usedPaths = new Set(filenameCache.values());
    let counter = 1;
    const nameWithoutExt = path.parse(relPath).name;
    const dirName = path.dirname(relPath);
    const ext = path.parse(relPath).ext;

    let candidate = relPath;
    while (usedPaths.has(candidate) && counter < 1000) {
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

  // 1. Tag attributes (src, href, poster, data-src, etc.)
  const attrRegex = /(?:src|href|content|poster|data-src|data-href|data-poster|data-original|data-lazy-src|data-image|data-bg|data-background|xlink:href)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = attrRegex.exec(html)) !== null) {
    try {
      const href = match[1].trim();
      if (!href || href.startsWith('data:') || href.startsWith('javascript:') || href.startsWith('#')) continue;
      const resolved = new URL(href, baseUrl).href;
      if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
        urls.add(resolved);
      }
    } catch { /* skip */ }
  }

  // 2. Srcset attributes (img srcset, source srcset, data-srcset)
  const srcsetRegex = /(?:srcset|data-srcset)\s*=\s*["']([^"']+)["']/gi;
  while ((match = srcsetRegex.exec(html)) !== null) {
    try {
      const srcsetVal = match[1].trim();
      const parts = srcsetVal.split(',');
      for (const part of parts) {
        const item = part.trim().split(/\s+/)[0];
        if (item && !item.startsWith('data:')) {
          const resolved = new URL(item, baseUrl).href;
          if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
            urls.add(resolved);
          }
        }
      }
    } catch { /* skip */ }
  }

  // 3. CSS url(...) references in HTML / style tags
  const cssUrlRegex = /url\((['"]?)([^'")]+)\1\)/gi;
  while ((match = cssUrlRegex.exec(html)) !== null) {
    try {
      const href = match[2].trim();
      if (!href || href.startsWith('data:') || href.startsWith('#')) continue;
      const resolved = new URL(href, baseUrl).href;
      if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
        urls.add(resolved);
      }
    } catch { /* skip */ }
  }

  // 4. String literals in JS scripts (e.g. "/images/...", "/_astro/...", etc.)
  const jsAssetRegex = /["'](\/(?:assets|images|img|media|fonts|static|_astro|_next|public)[^"'\s<>]+\.(?:png|jpg|jpeg|svg|webp|avif|gif|ico|bmp|mp4|webm|woff2|woff|ttf|eot))["']/gi;
  while ((match = jsAssetRegex.exec(html)) !== null) {
    try {
      const href = match[1].trim();
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

  // 2. Process all extracted asset URLs from static HTML & JS
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

  // 3. Scan all downloaded CSS files for internal url(...) assets (fonts, sprite masks, background images)
  const cssDir = path.join(outputDir, 'assets/css');
  if (fs.existsSync(cssDir)) {
    const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
    const cssAssetUrls = new Set();

    for (const cssFile of cssFiles) {
      try {
        const cssContent = fs.readFileSync(path.join(cssDir, cssFile), 'utf-8');
        const cssUrlRegex = /url\((['"]?)([^'")]+)\1\)/gi;
        let match;
        while ((match = cssUrlRegex.exec(cssContent)) !== null) {
          const rawUrl = match[2].trim();
          if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('#')) continue;
          try {
            const resolved = new URL(rawUrl, pageUrl).href;
            if ((resolved.startsWith('http://') || resolved.startsWith('https://')) && !globalAssetMap.has(resolved)) {
              cssAssetUrls.add(resolved);
            }
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }

    if (cssAssetUrls.size > 0) {
      const cssTasks = [...cssAssetUrls].map((assetUrl) => async () => {
        const category = classifyAsset(assetUrl);
        if (category === 'page' || isTrackerOrAnalytics(assetUrl)) return;
        const cleanRelPath = getCleanAssetPath(assetUrl, category, outputDir);
        const localPath = path.join(outputDir, cleanRelPath);
        const result = await downloadFile(assetUrl, localPath);
        if (result || fs.existsSync(localPath)) {
          registerAssetInMap(assetUrl, cleanRelPath);
        }
      });
      await runWithConcurrency(cssTasks, 8);
    }
  }

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
