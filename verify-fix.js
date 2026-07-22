import { rewriteHTML } from './src/rewriter.js';
import assert from 'assert';

const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
  <base href="https://example.com/sub/dir/">
  <link rel="stylesheet" href="https://example.com/css/style.css">
  <script src="https://example.com/js/app.js"></script>
  <style>
    .hero { background: url('https://example.com/images/hero.jpg'); }
  </style>
</head>
<body>
  <div style="background-image: url('https://example.com/images/bg.png');">
    <a href="https://example.com/about">About</a>
    <a href="https://example.com/">Home</a>
    <img src="https://example.com/images/logo.png">
  </div>
</body>
</html>
`;

const assetMap = new Map([
  ['https://example.com/css/style.css', 'css/style.css'],
  ['https://example.com/js/app.js', 'js/app.js'],
  ['https://example.com/images/hero.jpg', 'images/hero.jpg'],
  ['https://example.com/images/bg.png', 'images/bg.png'],
  ['https://example.com/images/logo.png', 'images/logo.png'],
]);

const pageMap = new Map([
  ['https://example.com', 'index.html'],
  ['https://example.com/', 'index.html'],
  ['https://example.com/about', 'pages/about.html'],
]);

// Test 1: Root page (index.html)
const rootRewritten = rewriteHTML(sampleHtml, 'https://example.com', 'https://example.com', assetMap, pageMap, {
  bundle: false,
  pageFilename: 'index.html'
});

console.log('--- ROOT PAGE (index.html) ---');
console.log(rootRewritten);

assert(!rootRewritten.includes('<base'), 'Base tag should be removed');
assert(rootRewritten.includes('href="./css/style.css"'), 'CSS path on root should be ./css/style.css');
assert(rootRewritten.includes('src="./js/app.js"'), 'JS path on root should be ./js/app.js');
assert(rootRewritten.includes('src="./images/logo.png"'), 'Image path on root should be ./images/logo.png');
assert(rootRewritten.includes('href="./pages/about.html"'), 'Link to about on root should be ./pages/about.html');
assert(rootRewritten.includes("url('./images/hero.jpg')"), 'Inline style url on root should be ./images/hero.jpg');
assert(rootRewritten.includes("url('./images/bg.png')"), 'Attribute style url on root should be ./images/bg.png');

// Test 2: Subpage (pages/about.html)
const subpageRewritten = rewriteHTML(sampleHtml, 'https://example.com/about', 'https://example.com', assetMap, pageMap, {
  bundle: false,
  pageFilename: 'pages/about.html'
});

console.log('\n--- SUBPAGE (pages/about.html) ---');
console.log(subpageRewritten);

assert(!subpageRewritten.includes('<base'), 'Base tag should be removed');
assert(subpageRewritten.includes('href="../css/style.css"'), 'CSS path on subpage should be ../css/style.css');
assert(subpageRewritten.includes('src="../js/app.js"'), 'JS path on subpage should be ../js/app.js');
assert(subpageRewritten.includes('src="../images/logo.png"'), 'Image path on subpage should be ../images/logo.png');
assert(subpageRewritten.includes('href="../index.html"'), 'Link to home on subpage should be ../index.html');
assert(subpageRewritten.includes('href="./about.html"'), 'Link to self on subpage should be ./about.html');
assert(subpageRewritten.includes("url('../images/hero.jpg')"), 'Inline style url on subpage should be ../images/hero.jpg');
assert(subpageRewritten.includes("url('../images/bg.png')"), 'Attribute style url on subpage should be ../images/bg.png');

console.log('\n✅ ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
