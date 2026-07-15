const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const srcDir = path.join(__dirname, 'src', 'hrms');
walkDir(srcDir, (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const importRegex = /import\s+.*?from\s+['"](.*?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      let importPath = match[1];
      if (importPath.startsWith('.') || importPath.startsWith('@/hrms/')) {
        let absolutePath;
        if (importPath.startsWith('.')) {
          absolutePath = path.resolve(path.dirname(filePath), importPath);
        } else {
          absolutePath = path.resolve(srcDir, importPath.replace('@/hrms/', ''));
        }
        
        const ext = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '.css', '.json'];
        let exists = false;
        if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) exists = true;
        else {
          for (const e of ext) {
            if (fs.existsSync(absolutePath + e)) {
              exists = true;
              break;
            }
          }
        }
        if (!exists) {
          console.log(`MISSING: ${importPath} in ${path.relative(__dirname, filePath)}`);
        }
      }
    }
  }
});
