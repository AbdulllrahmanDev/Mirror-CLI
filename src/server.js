import http from 'http';
import fs from 'fs';
import path from 'path';
import open from 'open';
import chalk from 'chalk';
import boxen from 'boxen';
import { getTheme, renderHeader } from './ui.js';
import { input } from '@inquirer/prompts';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.wasm': 'application/wasm'
};

/**
 * Start a local HTTP server for serving cloned websites with 100% ES Modules & CORS support
 */
export function startLocalServer(rootDir, preferredPort = 3000) {
  return new Promise((resolve, reject) => {
    let port = preferredPort;

    const server = http.createServer((req, res) => {
      // Enable CORS for all local resources
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      let reqPath = decodeURIComponent(req.url.split('?')[0]);
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

      let filePath = path.join(rootDir, reqPath);

      // Handle directories
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found: ' + reqPath);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      try {
        const fileStream = fs.createReadStream(filePath);
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache'
        });
        fileStream.pipe(res);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error: ' + err.message);
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        port++;
        server.listen(port);
      } else {
        reject(err);
      }
    });

    server.listen(port, () => {
      const url = `http://localhost:${port}`;
      resolve({ server, port, url });
    });
  });
}

/**
 * Interactive preview manager that launches the local server and opens browser
 */
export async function launchPreviewServer(outPath, autoOpen = true) {
  const theme = getTheme();
  const absPath = path.resolve(outPath);

  if (!fs.existsSync(absPath)) {
    console.log(chalk.red(`\n❌ Error: Directory not found: ${absPath}\n`));
    return;
  }

  try {
    const { server, port, url } = await startLocalServer(absPath, 3000);

    console.log('\n' + boxen(
      `${theme.chalkPrimary.bold('🚀 Local Live Server Running')}\n\n` +
      `${theme.chalkSecondary('Local URL:')}     ${chalk.green.bold(url)}\n` +
      `${theme.chalkSecondary('Serving From:')}   ${chalk.white(absPath)}\n` +
      `${theme.chalkSecondary('Features:')}       ${chalk.white('Full ES Modules (type="module"), CORS, WebGL & Canvas enabled')}\n\n` +
      theme.chalkMuted('Press Ctrl+C or enter "q" to stop the server.'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: theme.primaryHex,
        title: theme.chalkPrimary.bold(' [ Mirror Live Preview ] '),
        titleAlignment: 'left'
      }
    ));

    if (autoOpen) {
      await open(url);
    }

    return { server, url, port };
  } catch (err) {
    console.log(chalk.red(`\n❌ Failed to start local server: ${err.message}\n`));
  }
}

export function findLocalWebsiteFolders() {
  const folders = [];
  const searchDirs = ['./', 'downloads', 'mirrored-sites'];
  for (const sDir of searchDirs) {
    if (fs.existsSync(sDir)) {
      try {
        const items = fs.readdirSync(sDir, { withFileTypes: true });
        for (const item of items) {
          if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git' && item.name !== 'assets') {
            const dirPath = path.join(sDir, item.name).replace(/\\/g, '/');
            if (fs.existsSync(path.join(dirPath, 'index.html')) && !folders.includes(dirPath)) {
              folders.push(dirPath);
            }
          }
        }
      } catch { /* skip */ }
    }
  }
  return folders;
}

/**
 * Menu action to preview any cloned site
 */
export async function runPreviewMenu() {
  const theme = getTheme();
  renderHeader();
  console.log(theme.chalkPrimary.bold('\n[ Local Live Server & Site Preview ]\n'));
  console.log(theme.chalkMuted('  Launches a fast local HTTP server with full ES Modules & WebGL support.\n'));

  const discovered = findLocalWebsiteFolders();
  let folder = '';

  if (discovered.length > 0) {
    const choices = discovered.map((d, i) => ({
      name: `[${i + 1}]  ${d}`,
      value: d
    }));
    choices.push({ name: '[✏️] Custom Folder Path...', value: '__custom__' });

    const selected = await select({
      message: theme.chalkPrimary.bold('Select website folder to preview:'),
      choices
    });

    if (selected === '__custom__') {
      folder = await input({
        message: theme.chalkPrimary('Enter cloned website folder path:'),
        default: './',
        validate: (val) => fs.existsSync(val.trim()) ? true : 'Directory does not exist.'
      });
    } else {
      folder = selected;
    }
  } else {
    folder = await input({
      message: theme.chalkPrimary('Enter cloned website folder path:'),
      default: './',
      validate: (val) => fs.existsSync(val.trim()) ? true : 'Directory does not exist.'
    });
  }

  const preview = await launchPreviewServer(folder.trim(), true);
  if (preview) {
    await input({
      message: theme.chalkPrimary('↵ Press [ENTER] when you are finished to stop the server')
    });
    preview.server.close();
    console.log(theme.chalkMuted('\n  Local server stopped.\n'));
  }
}
