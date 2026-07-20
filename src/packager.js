import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

export function packSite(siteDir, domain) {
  return new Promise((resolve, reject) => {
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
