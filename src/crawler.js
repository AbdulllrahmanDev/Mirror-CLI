import puppeteer from 'puppeteer';

const visited = new Set();
const pages = [];
let browser;

function normalizeUrl(href, baseUrl) {
  try {
    const resolved = new URL(href, baseUrl);
    resolved.hash = '';
    return resolved.href.replace(/\/$/, '') || resolved.href;
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

function urlToFilename(urlStr) {
  const u = new URL(urlStr);
  let path = u.pathname;
  if (path.endsWith('/')) path += 'index';
  if (!path.includes('.')) path += '.html';
  if (path === '/index.html') path = 'index.html';
  return path.replace(/^\//, '').replace(/[<>:"/\\|?*]/g, '_').replace(/_+/g, '_');
}

export async function crawlSite(startUrl, { maxDepth = 3, verbose = false } = {}) {
  const domain = new URL(startUrl).hostname;
  const queue = [{ url: normalizeUrl(startUrl, startUrl), depth: 0 }];

  browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.createBrowserContext();

  while (queue.length > 0) {
    const item = queue.shift();
    const normalized = item.url;
    if (!normalized || visited.has(normalized)) continue;
    if (item.depth > maxDepth) continue;
    visited.add(normalized);

    if (verbose) console.log(`  Crawling: ${normalized}`);

    try {
      const page = await context.newPage();
      await page.setRequestInterception(true);

      page.on('request', (req) => {
        const type = req.resourceType();
        if (['document', 'script', 'stylesheet', 'image', 'font', 'media'].includes(type)) {
          req.continue();
        } else {
          req.abort();
        }
      });

      await page.goto(normalized, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      await autoScroll(page);

      const html = await page.content();
      const pageUrl = page.url();

      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.href)
          .filter(h => h && !h.startsWith('javascript:') && !h.startsWith('mailto:') && !h.startsWith('tel:'));
      });

      pages.push({
        url: normalizeUrl(pageUrl, startUrl) || normalizeUrl(startUrl, startUrl),
        html,
        filename: urlToFilename(pageUrl)
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
  await browser.close();

  return pages;
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight || totalHeight > 8000) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
