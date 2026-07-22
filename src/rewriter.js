import * as cheerio from 'cheerio';
import path from 'path';
import { isTrackerOrAnalytics } from './organizer.js';

function toRelative(pageFilename, targetRelPath) {
  const pageDir = path.posix.dirname(pageFilename.replace(/\\/g, '/'));
  let rel = path.posix.relative(pageDir, targetRelPath.replace(/\\/g, '/'));
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function resolveAssetPath(originalHref, pageUrl, assetMap, pageFilename) {
  if (!originalHref) return null;
  try {
    const fullUrl = new URL(originalHref, pageUrl).href;
    if (assetMap.has(fullUrl)) {
      return toRelative(pageFilename, assetMap.get(fullUrl));
    }
    const u = new URL(fullUrl);
    u.search = '';
    u.hash = '';
    if (assetMap.has(u.href)) {
      return toRelative(pageFilename, assetMap.get(u.href));
    }
  } catch { /* skip */ }
  return null;
}

function rewriteCssTextUrls(cssText, pageUrl, assetMap, pageFilename) {
  return cssText.replace(/url\((['"]?)([^'")]+)\1\)/gi, (match, quote, href) => {
    const hrefTrimmed = href.trim();
    if (!hrefTrimmed || hrefTrimmed.startsWith('data:')) return match;
    const resolved = resolveAssetPath(hrefTrimmed, pageUrl, assetMap, pageFilename);
    if (resolved) {
      return `url('${resolved}')`;
    }
    return match;
  });
}

function rewriteSrcset(srcset, pageUrl, assetMap, pageFilename) {
  try {
    const parts = srcset.split(',');
    const newParts = parts.map(part => {
      const tokens = part.trim().split(/\s+/);
      if (tokens[0]) {
        const resolved = resolveAssetPath(tokens[0], pageUrl, assetMap, pageFilename);
        if (resolved) tokens[0] = resolved;
      }
      return tokens.join(' ');
    });
    return newParts.join(', ');
  } catch {
    return srcset;
  }
}

function isTrackerScriptContent(content) {
  return /GoogleAnalyticsObject|gtag|fbq|hj\('|\bclarity\b/i.test(content);
}

export function rewriteHTML(html, pageUrl, baseUrl, assetMap, pageMap = new Map(), options = {}) {
  const { bundle = false, keepAnalytics = false, pageFilename = 'index.html' } = options;
  const $ = cheerio.load(html, { decodeEntities: false });

  // 1. Remove Subresource Integrity (SRI) integrity attributes from local files
  $('[integrity]').removeAttr('integrity');

  // 2. Remove tracker / analytics scripts & iframe pixels
  if (!keepAnalytics) {
    $('script').each((_, el) => {
      const src = $(el).attr('src');
      const content = $(el).html() || '';
      if ((src && isTrackerOrAnalytics(src)) || isTrackerScriptContent(content)) {
        $(el).remove();
      }
    });

    $('noscript, iframe, img').each((_, el) => {
      const src = $(el).attr('src');
      if (src && isTrackerOrAnalytics(src)) {
        $(el).remove();
      }
    });
  }

  // 3. Remove base tag to avoid relative resolution conflicts
  $('base').remove();

  // 4. Handle CSS links
  const cssLinks = $('link[rel="stylesheet"]');
  if (bundle && cssLinks.length > 0) {
    const bundleHref = toRelative(pageFilename, 'css/bundle.css');

    let firstReplaced = false;
    cssLinks.each((_, el) => {
      const href = $(el).attr('href');
      if (href && isTrackerOrAnalytics(href) && !keepAnalytics) {
        $(el).remove();
        return;
      }

      if (!firstReplaced) {
        $(el).attr('href', bundleHref);
        firstReplaced = true;
      } else {
        $(el).remove();
      }
    });
  } else {
    cssLinks.each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const resolved = resolveAssetPath(href, pageUrl, assetMap, pageFilename);
        if (resolved) {
          $(el).attr('href', resolved);
          $(el).removeAttr('crossorigin');
        }
      }
    });
  }

  // 5. Handle external JS scripts
  const jsScripts = $('script[src]');
  if (bundle && jsScripts.length > 0) {
    const bundleJsSrc = toRelative(pageFilename, 'js/bundle.js');

    let firstReplaced = false;
    jsScripts.each((_, el) => {
      const src = $(el).attr('src');
      if (src && isTrackerOrAnalytics(src) && !keepAnalytics) {
        $(el).remove();
        return;
      }

      if (!firstReplaced) {
        $(el).attr('src', bundleJsSrc);
        firstReplaced = true;
      } else {
        $(el).remove();
      }
    });
  } else {
    jsScripts.each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        const resolved = resolveAssetPath(src, pageUrl, assetMap, pageFilename);
        if (resolved) {
          $(el).attr('src', resolved);
          $(el).removeAttr('crossorigin');
        }
      }
    });
  }

  // 6. Update Images & Media
  $('img, source, video, audio, track, embed, iframe').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      const resolved = resolveAssetPath(src, pageUrl, assetMap, pageFilename);
      if (resolved) $(el).attr('src', resolved);
    }

    const srcset = $(el).attr('srcset');
    if (srcset) {
      const newSrcset = rewriteSrcset(srcset, pageUrl, assetMap, pageFilename);
      if (newSrcset) $(el).attr('srcset', newSrcset);
    }
  });

  // 7. Update Favicon / Icons / Preloads
  $('link[rel*="icon"], link[rel="preload"], link[rel="apple-touch-icon"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const resolved = resolveAssetPath(href, pageUrl, assetMap, pageFilename);
      if (resolved) $(el).attr('href', resolved);
    }
  });

  // 8. Update inline <style> tags and style="..." attributes
  $('style').each((_, el) => {
    let cssText = $(el).html();
    if (cssText) {
      cssText = rewriteCssTextUrls(cssText, pageUrl, assetMap, pageFilename);
      $(el).html(cssText);
    }
  });

  $('[style]').each((_, el) => {
    let styleAttr = $(el).attr('style');
    if (styleAttr && styleAttr.includes('url(')) {
      styleAttr = rewriteCssTextUrls(styleAttr, pageUrl, assetMap, pageFilename);
      $(el).attr('style', styleAttr);
    }
  });

  // 9. Update internal page links (<a> tags)
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    try {
      const fullUrl = new URL(href, pageUrl).href;
      const normalizedFullUrl = fullUrl.replace(/\/$/, '');

      if (pageMap.has(fullUrl)) {
        const targetFilename = pageMap.get(fullUrl);
        $(el).attr('href', toRelative(pageFilename, targetFilename));
      } else if (pageMap.has(normalizedFullUrl)) {
        const targetFilename = pageMap.get(normalizedFullUrl);
        $(el).attr('href', toRelative(pageFilename, targetFilename));
      } else {
        const resolved = resolveAssetPath(href, pageUrl, assetMap, pageFilename);
        if (resolved) $(el).attr('href', resolved);
      }
    } catch { /* skip */ }
  });

  return $.html();
}
