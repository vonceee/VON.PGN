const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.html') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, '..', 'src'));
let changed = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('ui-panel')) {
    // Replace 'ui-panel' with 'bg-main rounded-4xl shadow-xl border border-border-base'
    const newContent = content.replace(/\bui-panel\b/g, 'bg-main rounded-4xl shadow-xl border border-border-base');
    if (content !== newContent) {
      fs.writeFileSync(file, newContent);
      changed++;
      console.log(`Updated ${file}`);
    }
  }
});

console.log(`Done! Modified ${changed} files.`);
