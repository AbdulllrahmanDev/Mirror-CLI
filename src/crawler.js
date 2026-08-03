import puppeteer from 'puppeteer';
import { URL } from 'url';

const visited = new Set();
const pages = [];

function normalizeUrl(href, baseUrl) {
  try {
    const resolved = new URL(href, baseUrl);
    resolved.hash = '';
    const paramsToKeep = new URLSearchParams();
    for (const [key, val] of resolved.searchParams.entries()) {
      if (!key.startsWith('utm_') && key !== 'ref' && key !== 'fbclid' && key !== 'gclid') {
        paramsToKeep.append(key, val);
      }
    }
    resolved.search = paramsToKeep.toString() ? `?${paramsToKeep.toString()}` : '';

    let urlStr = resolved.href;
    if (urlStr.endsWith('/') && urlStr !== resolved.origin + '/') {
      urlStr = urlStr.slice(0, -1);
    }
    return urlStr;
  } catch {
    return null;
  }
}

function isSameDomain(urlStr, domain) {
  try {
    const u = new URL(urlStr);
    return u.hostname === domain;
  } catch {
    return false;
  }
}

function urlToFilename(urlStr, startUrl) {
  try {
    const startObj = new URL(startUrl);
    const u = new URL(urlStr);

    let p = u.pathname || '/';
    if (p.endsWith('/') && p !== '/') p = p.slice(0, -1);

    if (p === '' || p === '/' || u.href === startUrl || p === startObj.pathname) {
      return 'index.html';
    }

    // Clean leading slash
    p = p.replace(/^\//, '');

    // Strip redundant leading "pages/" if already present to prevent pages/pages/ nesting
    if (p.startsWith('pages/')) {
      p = p.substring(6);
    }

    // Remove file extensions
    p = p.replace(/\.(html|htm|php|asp|aspx)$/i, '');

    let slug = p.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
    if (!slug || slug === 'index') return 'index.html';

    return `pages/${slug}.html`;
  } catch {
    return 'pages/page.html';
  }
}

export async function crawlSite(startUrl, { maxDepth = 3, verbose = false, onProgress = null } = {}) {
  visited.clear();
  pages.length = 0;

  const domain = new URL(startUrl).hostname;
  const startNormalized = normalizeUrl(startUrl, startUrl);
  const queue = [{ url: startNormalized, depth: 0 }];

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  try {
    const context = await browser.createBrowserContext();

    while (queue.length > 0) {
      const item = queue.shift();
      const normalized = item.url;
      if (!normalized || visited.has(normalized)) continue;
      if (item.depth > maxDepth) continue;
      visited.add(normalized);

      if (onProgress) {
        onProgress(normalized, pages.length);
      }

      if (verbose) console.log(`  Crawling: ${normalized}`);

      try {
        const page = await context.newPage();

        const capturedResponses = new Map();
        page.on('response', async (res) => {
          try {
            const u = res.url();
            if (res.status() >= 200 && res.status() < 300 && (u.startsWith('http://') || u.startsWith('https://'))) {
              const buf = await res.buffer();
              capturedResponses.set(u, buf);
            }
          } catch { /* ignore buffer error */ }
        });

        await page.goto(normalized, {
          waitUntil: 'networkidle2',
          timeout: 35000
        });

        await autoScroll(page);

        // Delay to allow dynamic animations/chunks to finish rendering
        await page.evaluate(() => new Promise(r => setTimeout(r, 1200)));

        const html = await page.content();
        const pageUrl = page.url();

        const links = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a[href]'))
            .map(a => a.href)
            .filter(h => h && !h.startsWith('javascript:') && !h.startsWith('mailto:') && !h.startsWith('tel:'));
        });

        pages.push({
          url: normalizeUrl(pageUrl, startUrl) || startNormalized,
          html,
          filename: urlToFilename(pageUrl, startUrl),
          capturedResponses
        });

        await page.close();

        for (const link of links) {
          const normalizedLink = normalizeUrl(link, startUrl);
          if (normalizedLink && isSameDomain(normalizedLink, domain) && !visited.has(normalizedLink)) {
            const alreadyQueued = queue.some(q => q.url === normalizedLink);
            if (!alreadyQueued) {
              queue.push({ url: normalizedLink, depth: item.depth + 1 });
            }
          }
        }
      } catch (err) {
        if (verbose) console.error(`  Failed: ${normalized} — ${err.message}`);
      }
    }

    await context.close();
  } finally {
    await browser.close();
  }

  return pages;
}

async function autoScroll(page) {
  try {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 350;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight || 1200;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight || totalHeight > 4000) {
            clearInterval(timer);
            window.scrollTo(0, 0); // Scroll back to top for initial animation triggers
            resolve();
          }
        }, 40);
      });
    });
  } catch { /* skip scroll errors */ }
}
