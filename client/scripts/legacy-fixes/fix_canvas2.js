const fs = require('fs');
let code = fs.readFileSync('components/CanvasBlocks.tsx', 'utf8');

code = code.replace(
    /title="Drag to move block"\r?\n\s+ref=\{dragRef\}/g,
    'title="Drag to move block"\n                  onMouseDown={onMD}'
);

fs.writeFileSync('components/CanvasBlocks.tsx', code);
