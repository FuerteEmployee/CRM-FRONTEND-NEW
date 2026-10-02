const fs = require('fs');
const path = require('path');

const walk = (dir, done) => {
  let results = [];
  fs.readdir(dir, (err, list) => {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(file => {
      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(file, (err, res) => {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
          }
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

walk('d:/CRM ALL/Frontend/src', (err, results) => {
  if (err) throw err;
  results.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Pattern 1: No ... selected. or Please select at least one ... first.
    let regex1 = /(toast\(\{\s*title:\s*["'][^"']+["'],\s*description:\s*["'](?:No [a-zA-Z\s]+ selected\.?|Please select at least one [a-zA-Z\s]+ first\.?|Select items first to apply bulk actions\.?)["'])(,\s*variant:\s*["']destructive["']\s*)(\}\))/gi;
    content = content.replace(regex1, '$1$3');

    // Extra case: "No items selected." might use different variables or something, wait no the regex covers "No items selected."
    
    // There are some other cases like: "Choose Mass Delete or enter a Sales Person to update." or "Select an employee"
    let regex2 = /(toast\(\{\s*title:\s*["'][^"']+["'],\s*description:\s*["'](?:Choose Mass Delete or enter a Sales Person to update\.|Select an employee|Please select an associated store\.)["'])(,\s*variant:\s*["']destructive["']\s*)(\}\))/gi;
    content = content.replace(regex2, '$1$3');

    // Fallback: any toast description that has "select" in it and is destructive
    let regex3 = /(toast\(\{\s*title:\s*["'][^"']+["'],\s*description:\s*["'][^"']*select[^"']*["'])(,\s*variant:\s*["']destructive["']\s*)(\}\))/gi;
    content = content.replace(regex3, '$1$3');
    
    // Also consider "Failed to perform bulk action."
    let regex4 = /(toast\(\{\s*title:\s*["'][^"']+["'],\s*description:\s*["'][^"']*bulk action[^"']*["'])(,\s*variant:\s*["']destructive["']\s*)(\}\))/gi;
    content = content.replace(regex4, '$1$3');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Updated:', file);
    }
  });
});
