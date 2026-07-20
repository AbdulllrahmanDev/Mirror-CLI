export function rewriteHTML(html, pageUrl, baseUrl, assetMap) {
  let result = html;
  const seen = new Set();

  for (const [originalUrl, localPath] of assetMap) {
    if (seen.has(originalUrl)) continue;
    seen.add(originalUrl);

    const escaped = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const relativePath = getRelativePath(pageUrl, localPath);

    result = result.replace(
      new RegExp(`(['"])${escaped}(['"])`, 'gi'),
      (match, q1, q2) => `${q1}${relativePath}${q2}`
    );

    const encodedUrl = encodeURI(originalUrl).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (encodedUrl !== escaped) {
      result = result.replace(
        new RegExp(`(['"])${encodedUrl}(['"])`, 'gi'),
        (match, q1, q2) => `${q1}${relativePath}${q2}`
      );
    }

    result = result.replace(
      new RegExp(`url\\(['"]?${escaped}['"]?\\)`, 'gi'),
      `url('${relativePath}')`
    );
  }

  result = addBaseTag(result, baseUrl);

  return result;
}

function getRelativePath(fromUrl, toPath) {
  try {
    const fromPath = new URL(fromUrl).pathname;
    const fromDir = fromPath.substring(0, fromPath.lastIndexOf('/') + 1) || '/';
    const fromParts = fromDir.split('/').filter(Boolean);
    const toParts = toPath.split('/').filter(Boolean);

    let commonLength = 0;
    const minLen = Math.min(fromParts.length, toParts.length);
    for (let i = 0; i < minLen; i++) {
      if (fromParts[i] === toParts[i]) commonLength++;
      else break;
    }

    const upCount = fromParts.length - commonLength;
    const up = upCount > 0 ? new Array(upCount).fill('..').join('/') : '.';
    const down = toParts.slice(commonLength).join('/');
    return up === '.' && down ? down : `${up}/${down}`;
  } catch {
    return toPath;
  }
}

function addBaseTag(html, baseUrl) {
  if (/<base\s/i.test(html)) return html;
  return html.replace(
    /(<head[^>]*>)/i,
    `$1\n<base href="./">`
  );
}
