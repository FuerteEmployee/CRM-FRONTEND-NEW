const fs = require('fs');
let content = fs.readFileSync('src/pages/CustomerView.tsx', 'utf8');

// Replace standard search Inputs with VoiceInput
content = content.replace(
  /<Input\s+placeholder="Search\b([^"]+)"([\s\S]*?)onChange=\{\(e\) => set([A-Za-z0-9_]+)\(e\.target\.value\)\}([\s\S]*?)\/>/g,
  (match, searchType, middle, setterName, end) => {
    return `<VoiceInput\n                              placeholder="Search${searchType}"${middle}onChange={(e: any) => set${setterName}(e.target.value)}${end}/>`;
  }
);

fs.writeFileSync('src/pages/CustomerView.tsx', content);
