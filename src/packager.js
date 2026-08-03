import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

export function flattenNestedDirectories(siteDir) {
  if (!fs.existsSync(siteDir)) return;

  const doublePagesDir = path.join(siteDir, 'pages', 'pages');
  if (fs.existsSync(doublePagesDir)) {
    const parentPagesDir = path.join(siteDir, 'pages');
    const items = fs.readdirSync(doublePagesDir);
    for (const item of items) {
      const src = path.join(doublePagesDir, item);
      const dest = path.join(parentPagesDir, item);
      if (!fs.existsSync(dest)) {
        fs.renameSync(src, dest);
      }
    }
    try { fs.rmdirSync(doublePagesDir); } catch { /* skip */ }
  }

  const doubleAssetsDir = path.join(siteDir, 'assets', 'assets');
  if (fs.existsSync(doubleAssetsDir)) {
    const parentAssetsDir = path.join(siteDir, 'assets');
    const items = fs.readdirSync(doubleAssetsDir);
    for (const item of items) {
      const src = path.join(doubleAssetsDir, item);
      const dest = path.join(parentAssetsDir, item);
      if (!fs.existsSync(dest)) {
        fs.renameSync(src, dest);
      }
    }
    try { fs.rmdirSync(doubleAssetsDir); } catch { /* skip */ }
  }
}

export function removeEmptyDirectories(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  if (files.length > 0) {
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        removeEmptyDirectories(fullPath);
      }
    }
  }

  // Re-read after recursive cleanup
  const remaining = fs.readdirSync(dir);
  if (remaining.length === 0) {
    fs.rmdirSync(dir);
  }
}

export function packSite(siteDir, domain) {
  return new Promise((resolve, reject) => {
    // Perform cleanup of nested and empty directories before zipping
    flattenNestedDirectories(siteDir);
    removeEmptyDirectories(siteDir);

    const zipPath = path.join(path.dirname(siteDir), `${domain}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(zipPath));
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(siteDir, false);
    archive.finalize();
  });
}
