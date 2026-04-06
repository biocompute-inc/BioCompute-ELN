const fs = require('fs');
let blocks = fs.readFileSync('components/CanvasBlocks.tsx', 'utf8');

blocks = blocks.replace(
  '<button key={t} onClick={() => onSelect(t)}',
  '<button title={\Add \ block\} key={t} onClick={() => onSelect(t)}'
);

blocks = blocks.replace(
  'onMouseDown={onMouseDown}',
  'title="Drag to move block"\n                    onMouseDown={onMouseDown}'
);

fs.writeFileSync('components/CanvasBlocks.tsx', blocks);
