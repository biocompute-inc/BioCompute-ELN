const fs = require('fs');
let page = fs.readFileSync('app/canvas/[id]/page.tsx', 'utf8');

page = page.replace(
  '<div ref={canvasRef} onMouseDown={onCMD}',
  '<div title="Click and drag background to pan" ref={canvasRef} onMouseDown={onCMD}'
);

fs.writeFileSync('app/canvas/[id]/page.tsx', page);
