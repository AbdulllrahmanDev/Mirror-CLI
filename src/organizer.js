import path from 'path';
import crypto from 'crypto';
import { URL } from 'url';

const TRACKER_DOMAINS = [
  'google-analytics.com',
  'googletagmanager.com',
  'connect.facebook.net',
  'facebook.com/tr',
  'static.hotjar.com',
  'script.hotjar.com',
  'www.clarity.ms',
  'c.bing.com',
  'doubleclick.net',
  'adservice.google.com',
  'analytics.tiktok.com',
  'pixel.wp.com',
  'stats.wp.com'
];

const TRACKER_PATTERNS = [
  /\/analytics\.js/i,
  /\/gtag\/js/i,
  /\/fbevents\.js/i,
  /\/hotjar-/i,
  /\/pixel/i,
  /beacon/i
];

export function isTrackerOrAnalytics(urlStr) {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    const fullUrl = u.href.toLowerCase();

    if (TRACKER_DOMAINS.some(domain => host.includes(domain))) {
      return true;
    }
    if (TRACKER_PATTERNS.some(pattern => pattern.test(fullUrl))) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function classifyAsset(urlStr) {
  try {
    const u = new URL(urlStr);
    const pathname = u.pathname.toLowerCase();

    if (pathname.endsWith('.html') || pathname.endsWith('.htm') || pathname.endsWith('.php') || pathname.endsWith('.asp')) {
      return 'page';
    }
    if (pathname.endsWith('.css') || pathname.includes('.css?')) return 'css';
    if (pathname.endsWith('.js') || pathname.endsWith('.mjs') || pathname.includes('.js?')) return 'js';
    
    if (/\.(png|jpe?g|webp|svg|gif|ico|avif|bmp|tiff)$/i.test(pathname)) return 'images';
    if (/\.(woff2?|ttf|eot|otf)$/i.test(pathname)) return 'fonts';
    if (/\.(mp4|webm|mov|avi|mp3|wav|ogg|flv|m4a)$/i.test(pathname)) return 'media';

    if (u.search.includes('font') || pathname.includes('font')) return 'fonts';
    if (pathname.includes('css')) return 'css';
    if (pathname.includes('js')) return 'js';
    if (pathname.includes('image') || pathname.includes('img') || pathname.includes('photo')) return 'images';

    return 'images';
  } catch {
    return 'other';
  }
}

const usedFilenames = new Map();

export function resetFilenameCache() {
  usedFilenames.clear();
}

export function getCleanAssetPath(urlStr, category, outDir) {
  try {
    const u = new URL(urlStr);
    let rawName = path.basename(u.pathname);

    rawName = rawName.split('?')[0].split('#')[0];
    if (!rawName || rawName.includes('=') || rawName.length > 80 || rawName.includes(':')) {
      const ext = getExtensionForCategory(category, u.pathname);
      const hash = crypto.createHash('md5').update(urlStr).digest('hex').substring(0, 8);
      rawName = `asset_${hash}${ext}`;
    }

    let safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');

    if (!path.extname(safeName)) {
      safeName += getExtensionForCategory(category, u.pathname);
    }

    if (!usedFilenames.has(category)) {
      usedFilenames.set(category, new Map());
    }
    const catMap = usedFilenames.get(category);

    if (catMap.has(urlStr)) {
      return catMap.get(urlStr);
    }

    let finalName = safeName;
    let counter = 1;
    const existingNames = new Set(catMap.values());

    while (existingNames.has(finalName)) {
      const ext = path.extname(safeName);
      const base = path.basename(safeName, ext);
      finalName = `${base}_${counter}${ext}`;
      counter++;
    }

    const relPath = path.join(category, finalName).replace(/\\/g, '/');
    catMap.set(urlStr, relPath);
    return relPath;
  } catch {
    const hash = crypto.createHash('md5').update(urlStr).digest('hex').substring(0, 8);
    const ext = getExtensionForCategory(category, '');
    return `${category}/asset_${hash}${ext}`;
  }
}

function getExtensionForCategory(category, pathname) {
  const ext = path.extname(pathname);
  if (ext && ext.length <= 5) return ext;
  switch (category) {
    case 'css': return '.css';
    case 'js': return '.js';
    case 'fonts': return '.woff2';
    case 'media': return '.mp4';
    case 'images':
    default:
      return '.png';
  }
}
