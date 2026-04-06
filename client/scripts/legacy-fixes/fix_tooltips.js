const fs = require('fs');

let page = fs.readFileSync('app/canvas/[id]/page.tsx', 'utf8');
page = page.replace('<button onClick={() => router.push("/")}', '<button title="Return to Dashboard" onClick={() => router.push("/")}');
page = page.replace('{selected && <button onClick={() =>', '{selected && <button title="Delete Selected Block" onClick={() =>');
page = page.replace('<button onClick={() => zoomOut()} style={{', '<button title="Zoom Out" onClick={() => zoomOut()} style={{');
page = page.replace('<div onClick={() => resetZoom()} style={{', '<div title="Reset Zoom" style={{ cursor: "pointer", '); // fixed style replacement to add title
page = page.replace('<div onClick={() => resetZoom()} style={{', '<div title="Reset Zoom" onClick={() => resetZoom()} style={{');
page = page.replace('<button onClick={() => zoomIn()} style={{', '<button title="Zoom In" onClick={() => zoomIn()} style={{');

fs.writeFileSync('app/canvas/[id]/page.tsx', page);

let blocks = fs.readFileSync('components/CanvasBlocks.tsx', 'utf8');
blocks = blocks.replace(
  /onClick=\{\(\) => addBlock\('(note|protocol|data|file)'\)\}/g,
  (match, p1) => \	itle="Add \ Block" \\
);
blocks = blocks.replace(
  '<div\r\n            onMouseDown={onMouseDown}',
  '<div title="Drag to move block"\n            onMouseDown={onMouseDown}'
);
blocks = blocks.replace(
  '<div\n            onMouseDown={onMouseDown}',
  '<div title="Drag to move block"\n            onMouseDown={onMouseDown}'
);

fs.writeFileSync('components/CanvasBlocks.tsx', blocks);
