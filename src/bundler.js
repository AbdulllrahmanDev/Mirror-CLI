import fs from 'fs';
import path from 'path';

export function bundleSiteAssets(outputDir, assetMap, options = {}) {
  const { bundle = true, verbose = false } = options;
  if (!bundle) return assetMap;

  const cssFiles = [];
  const jsFiles = [];

  for (const [originalUrl, relativePath] of assetMap.entries()) {
    const fullPath = path.join(outputDir, relativePath);
    if (!fs.existsSync(fullPath)) continue;

    if (relativePath.startsWith('css/') && relativePath !== 'css/bundle.css') {
      cssFiles.push({ originalUrl, relativePath, fullPath });
    } else if (relativePath.startsWith('js/') && relativePath !== 'js/bundle.js') {
      jsFiles.push({ originalUrl, relativePath, fullPath });
    }
  }

  const updatedMap = new Map(assetMap);

  // Bundle CSS
  if (cssFiles.length > 0) {
    const bundleCssRel = 'css/bundle.css';
    const bundleCssFull = path.join(outputDir, bundleCssRel);
    fs.mkdirSync(path.dirname(bundleCssFull), { recursive: true });

    let bundledCssContent = '';

    for (const file of cssFiles) {
      try {
        let content = fs.readFileSync(file.fullPath, 'utf-8');
        content = fixCssRelativeUrls(content, file.relativePath, bundleCssRel);
        bundledCssContent += `/* Bundle source: ${file.relativePath} */\n` + content + '\n\n';

        // Remove original individual css file
        fs.unlinkSync(file.fullPath);
      } catch (err) {
        if (verbose) console.error(`  Failed to bundle CSS ${file.relativePath}: ${err.message}`);
      }

      updatedMap.set(file.originalUrl, bundleCssRel);
    }

    fs.writeFileSync(bundleCssFull, bundledCssContent, 'utf-8');
    if (verbose) console.log(`  Bundled ${cssFiles.length} CSS file(s) -> ${bundleCssRel}`);
  }

  // Bundle JS
  if (jsFiles.length > 0) {
    const bundleJsRel = 'js/bundle.js';
    const bundleJsFull = path.join(outputDir, bundleJsRel);
    fs.mkdirSync(path.dirname(bundleJsFull), { recursive: true });

    let bundledJsContent = '';

    for (const file of jsFiles) {
      try {
        const content = fs.readFileSync(file.fullPath, 'utf-8');
        bundledJsContent += `/* Bundle source: ${file.relativePath} */\n` + content + ';\n\n';

        // Remove original individual js file
        fs.unlinkSync(file.fullPath);
      } catch (err) {
        if (verbose) console.error(`  Failed to bundle JS ${file.relativePath}: ${err.message}`);
      }

      updatedMap.set(file.originalUrl, bundleJsRel);
    }

    fs.writeFileSync(bundleJsFull, bundledJsContent, 'utf-8');
    if (verbose) console.log(`  Bundled ${jsFiles.length} JS file(s) -> ${bundleJsRel}`);
  }

  return updatedMap;
}

function fixCssRelativeUrls(cssContent, oldCssRelPath, newCssRelPath) {
  const oldDir = path.dirname(oldCssRelPath); // e.g. "css"
  const newDir = path.dirname(newCssRelPath); // e.g. "css"

  return cssContent.replace(/url\((['"]?)([^'")]+)\1\)/gi, (match, quote, relUrl) => {
    if (relUrl.startsWith('data:') || relUrl.startsWith('http://') || relUrl.startsWith('https://') || relUrl.startsWith('/')) {
      return match;
    }

    // Resolve relative path from root outputDir
    const resolvedFromRoot = path.posix.normalize(path.posix.join(oldDir.replace(/\\/g, '/'), relUrl));
    // Calculate new relative path from newDir (e.g. "css")
    let newRel = path.posix.relative(newDir.replace(/\\/g, '/'), resolvedFromRoot);
    if (!newRel.startsWith('.')) newRel = './' + newRel;

    return `url('${newRel}')`;
  });
}
