import * as cheerio from 'cheerio';
import path from 'path';
import fs from 'fs';
import { isTrackerOrAnalytics } from './organizer.js';

function toRelative(pageFilename, targetRelPath) {
  const pageDir = path.posix.dirname(pageFilename.replace(/\\/g, '/'));
  let rel = path.posix.relative(pageDir, targetRelPath.replace(/\\/g, '/'));
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function resolveAssetPath(originalHref, pageUrl, assetMap, pageFilename) {
  if (!originalHref) return null;
  const trimmed = originalHref.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('javascript:') || trimmed.startsWith('#') || trimmed.startsWith('mailto:')) {
    return null;
  }

  try {
    const fullUrl = new URL(trimmed, pageUrl).href;
    const u = new URL(fullUrl);
    const cleanFullUrl = u.origin + u.pathname;
    const pathname = u.pathname;
    const relPathname = pathname.replace(/^\//, '');
    const filename = path.basename(pathname);

    // 1. Match exact full URL
    if (assetMap.has(fullUrl)) return toRelative(pageFilename, assetMap.get(fullUrl));
    // 2. Match URL without query/hash
    if (assetMap.has(cleanFullUrl)) return toRelative(pageFilename, assetMap.get(cleanFullUrl));
    // 3. Match absolute pathname (/assets/js/2.BVb-LtpJ.js)
    if (assetMap.has(pathname)) return toRelative(pageFilename, assetMap.get(pathname));
    // 4. Match relative pathname (assets/js/2.BVb-LtpJ.js)
    if (assetMap.has(relPathname)) return toRelative(pageFilename, assetMap.get(relPathname));
    // 5. Match filename (2.BVb-LtpJ.js)
    if (filename && filename.includes('.') && assetMap.has(filename)) {
      return toRelative(pageFilename, assetMap.get(filename));
    }

    // 6. Universal Fallback: Convert root-relative paths (/assets/...) into relative local paths
    if (trimmed.startsWith('/')) {
      return toRelative(pageFilename, relPathname);
    }
  } catch {
    if (trimmed.startsWith('/')) {
      return toRelative(pageFilename, trimmed.replace(/^\//, ''));
    }
  }
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

  // 6. Update Images & Media (including data-src, poster, data-bg, svg images, srcset)
  $('img, source, video, audio, track, embed, iframe, image, use, [data-src], [data-href], [data-poster], [data-bg], [data-image]').each((_, el) => {
    ['src', 'data-src', 'data-href', 'data-poster', 'poster', 'data-original', 'data-lazy-src', 'data-image', 'data-bg', 'href', 'xlink:href'].forEach(attr => {
      const val = $(el).attr(attr);
      if (val && !val.startsWith('#')) {
        const resolved = resolveAssetPath(val, pageUrl, assetMap, pageFilename);
        if (resolved) {
          $(el).attr(attr, resolved);
        } else if (val.startsWith('/_astro/') || val.startsWith('/assets/')) {
          const clean = val.replace(/^\//, '');
          $(el).attr(attr, toRelative(pageFilename, clean.startsWith('assets/') ? clean : `assets/misc/${path.basename(clean)}`));
        }
      }
    });

    const srcset = $(el).attr('srcset');
    if (srcset) {
      const newSrcset = rewriteSrcset(srcset, pageUrl, assetMap, pageFilename);
      if (newSrcset) $(el).attr('srcset', newSrcset);
    }

    const dataSrcset = $(el).attr('data-srcset');
    if (dataSrcset) {
      const newSrcset = rewriteSrcset(dataSrcset, pageUrl, assetMap, pageFilename);
      if (newSrcset) $(el).attr('data-srcset', newSrcset);
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

  // 9. Update internal page links (<a> tags) & sanitize .bin targets
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    if (href.includes('cdn-cgi/l/email-protection')) {
      $(el).attr('href', 'mailto:contact@' + (new URL(pageUrl).hostname || 'domain.com'));
      return;
    }

    try {
      const fullUrl = new URL(href, pageUrl).href;
      const normalizedFullUrl = fullUrl.replace(/\/$/, '');

      const u = new URL(fullUrl);
      const pathname = u.pathname;
      const relPathname = pathname.replace(/^\//, '');

      if (pageMap.has(fullUrl)) {
        const targetFilename = pageMap.get(fullUrl);
        $(el).attr('href', toRelative(pageFilename, targetFilename));
      } else if (pageMap.has(normalizedFullUrl)) {
        const targetFilename = pageMap.get(normalizedFullUrl);
        $(el).attr('href', toRelative(pageFilename, targetFilename));
      } else if (pageMap.has(pathname)) {
        const targetFilename = pageMap.get(pathname);
        $(el).attr('href', toRelative(pageFilename, targetFilename));
      } else if (pageMap.has(relPathname)) {
        const targetFilename = pageMap.get(relPathname);
        $(el).attr('href', toRelative(pageFilename, targetFilename));
      } else {
        const resolved = resolveAssetPath(href, pageUrl, assetMap, pageFilename);
        if (resolved) {
          if (resolved.endsWith('.bin') || resolved.includes('asset.bin')) {
            const anchorHash = href.includes('#') ? '#' + href.split('#')[1] : '#';
            $(el).attr('href', anchorHash);
          } else {
            $(el).attr('href', resolved);
          }
        }
      }
    } catch { /* skip */ }
  });

  // 10. Inject Preloader Fallback Sanitation Styles
  if ($('head').length > 0 && !$('#mirror-scroll-fix').length) {
    $('head').append(`
      <style id="mirror-scroll-fix">
        .pl-overlay, .preloader-overlay, .preloader-wrapper { pointer-events: none !important; opacity: 0 !important; visibility: hidden !important; display: none !important; }
      </style>
    `);
  }

  return $.html();
}

export function rewriteCSSFiles(outputDir, assetMap, baseUrl) {
  // Build a fast lookup for all actual files on disk inside assets/
  const diskAssets = new Map(); // basename -> relativePathFromOutputDir
  function indexDiskFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        indexDiskFiles(full);
      } else if (entry.isFile()) {
        const rel = path.relative(outputDir, full).replace(/\\/g, '/');
        diskAssets.set(entry.name, rel);
      }
    }
  }
  indexDiskFiles(path.join(outputDir, 'assets'));

  function scanAndRewrite(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanAndRewrite(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.css')) {
        try {
          let css = fs.readFileSync(fullPath, 'utf-8');
          const relCssPath = path.relative(outputDir, fullPath).replace(/\\/g, '/');
          const cssDir = path.dirname(fullPath);

          css = css.replace(/url\((['"]?)([^'")]+)\1\)/gi, (match, quote, href) => {
            const hrefTrimmed = href.trim();
            if (!hrefTrimmed || hrefTrimmed.startsWith('data:') || hrefTrimmed.startsWith('#')) return match;

            // 1. Try resolving via assetMap
            let resolved = resolveAssetPath(hrefTrimmed, baseUrl, assetMap, relCssPath);

            // 2. Validate existence on disk or fallback to filename disk matching
            const filename = path.basename(hrefTrimmed.split('?')[0].split('#')[0]);
            if (diskAssets.has(filename)) {
              const actualRelPath = diskAssets.get(filename);
              const targetFullPath = path.join(outputDir, actualRelPath);
              resolved = path.relative(cssDir, targetFullPath).replace(/\\/g, '/');
              if (!resolved.startsWith('.')) resolved = './' + resolved;
            }

            if (resolved) {
              return `url('${resolved}')`;
            }
            return match;
          });

          fs.writeFileSync(fullPath, css, 'utf-8');
        } catch { /* skip */ }
      }
    }
  }
  scanAndRewrite(outputDir);
}

export function rewriteJSFiles(outputDir) {
  const diskImages = new Map();
  const imagesDir = path.join(outputDir, 'assets/images');
  if (fs.existsSync(imagesDir)) {
    for (const f of fs.readdirSync(imagesDir)) {
      diskImages.set(f, `./assets/images/${f}`);
    }
  }

  function scanAndFixJS(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        scanAndFixJS(full);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        try {
          let js = fs.readFileSync(full, 'utf-8');
          let modified = false;

          // Rewrite root image strings like "/images/asset-smiley--main.svg"
          for (const [basename, relPath] of diskImages) {
            const pattern = new RegExp(`["']/images/${basename}["']`, 'g');
            if (pattern.test(js)) {
              js = js.replace(pattern, `"${relPath}"`);
              modified = true;
            }
          }

          if (modified) {
            fs.writeFileSync(full, js, 'utf-8');
          }
        } catch { /* skip */ }
      }
    }
  }

  scanAndFixJS(path.join(outputDir, 'assets/js'));
}
