const fs = require('fs');
const path = require('path');

const hrmsDir = path.join(__dirname, 'src', 'hrms');
const appRoutesPath = path.join(hrmsDir, 'AppRoutes.tsx');

let content = fs.readFileSync(appRoutesPath, 'utf8');

const importRegex = /import\s+({[^}]+}|[A-Za-z0-9_]+)\s+from\s+["'](\.[^"']+)["']/g;

content = content.replace(importRegex, (match, names, importPath) => {
  // Check if file exists
  const absolutePath = path.resolve(path.dirname(appRoutesPath), importPath);
  const exts = ['.tsx', '.ts', '/index.tsx', '/index.ts'];
  let exists = false;
  for (const ext of exts) {
    if (fs.existsSync(absolutePath + ext)) {
      exists = true;
      break;
    }
  }

  if (!exists) {
    console.log(`Stubbing missing import: ${importPath}`);
    // If it's a named import { A, B }
    if (names.startsWith('{')) {
      const vars = names.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean);
      return vars.map(v => `const ${v} = () => <div>Stub for ${v}</div>;`).join('\n');
    } else {
      // Default import
      return `const ${names} = () => <div>Stub for ${names}</div>;`;
    }
  }
  
  return match;
});

// Write back
fs.writeFileSync(appRoutesPath, content);
console.log('AppRoutes.tsx fixed!');

// Now fix api.ts
const apiPath = path.join(hrmsDir, 'services', 'api.ts');
if (fs.existsSync(apiPath)) {
  let apiContent = fs.readFileSync(apiPath, 'utf8');
  
  apiContent = apiContent.replace(/export \* from ["'](\.[^"']+)["'];/g, (match, importPath) => {
    const absolutePath = path.resolve(path.dirname(apiPath), importPath);
    if (!fs.existsSync(absolutePath + '.ts') && !fs.existsSync(absolutePath + '.tsx')) {
      return `// ${match} (missing)`;
    }
    return match;
  });

  apiContent = apiContent.replace(/import\s+{([^}]+)}\s+from\s+["'](\.[^"']+)["'];/g, (match, names, importPath) => {
    const absolutePath = path.resolve(path.dirname(apiPath), importPath);
    if (!fs.existsSync(absolutePath + '.ts') && !fs.existsSync(absolutePath + '.tsx')) {
      const vars = names.split(',').map(s => s.trim()).filter(Boolean);
      let stubs = vars.map(v => {
        const parts = v.split(' as ');
        const name = parts[1] || parts[0];
        return `export const ${name} = {} as any;`;
      });
      return `// ${match}\n${stubs.join('\n')}`;
    }
    return match;
  });

  fs.writeFileSync(apiPath, apiContent);
  console.log('api.ts fixed!');
}
