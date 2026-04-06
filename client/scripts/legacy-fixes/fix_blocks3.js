const fs = require('fs');
let blocks = fs.readFileSync('components/CanvasBlocks.tsx', 'utf8');

blocks = blocks.replace(
  '<div ref={dragRef}',
  '<div title="Drag to move block"\n                  ref={dragRef}'
);

fs.writeFileSync('components/CanvasBlocks.tsx', blocks);
