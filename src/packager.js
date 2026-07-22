import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

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
    // Perform cleanup of empty directories before zipping
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
