const fs = require('fs');
let blocks = fs.readFileSync('components/CanvasBlocks.tsx', 'utf8');

// Undo the damaged one
blocks = blocks.replace(
  '<button title={Add  block} key={t}',
  '<button key={t}'
);

// Apply correctly
blocks = blocks.replace(
  '<button key={t} onClick={() => onSelect(t)}',
  '<button title={`Add ${t} block`} key={t} onClick={() => onSelect(t)}'
);

// Try again adding the Drag handle. Let's see if onMouseDown matches something else.
blocks = blocks.replace(
  'onMouseDown={onMouseDown}',
  'title="Drag to move block"\n                    onMouseDown={onMouseDown}'
);

fs.writeFileSync('components/CanvasBlocks.tsx', blocks);
