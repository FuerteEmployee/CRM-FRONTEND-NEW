const fs = require('fs');
const path = require('path');
const apiPath = path.join(__dirname, 'src', 'hrms', 'services', 'api.ts');
if (fs.existsSync(apiPath)) {
  let content = fs.readFileSync(apiPath, 'utf8');
  content = content.replace(/export const (.*?) = {} as any;/g, 'const $1 = {} as any;');
  fs.writeFileSync(apiPath, content);
  console.log('Fixed multiple exports in api.ts!');
}
