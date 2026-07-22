import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

const target = 'c:/Users/Drafter-5/Desktop/Mirror CLI/my-site3';
console.log(`Files in ${target}:`);
const files = walk(target);
console.log('Total files:', files.length);
console.log('CSS files:', files.filter(f => f.endsWith('.css')));
console.log('JS files:', files.filter(f => f.endsWith('.js')));
