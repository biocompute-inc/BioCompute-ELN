const fs = require('fs');
let code = fs.readFileSync('components/CanvasBlocks.tsx', 'utf8');

const regex = /export function CanvasBlock\([^)]+\) \{\n\s*const dragRef[\s\S]+?\}, \[block\.id, block\.x, block\.y, onChange\]\);\n/m;

const replacement = \xport function CanvasBlock({ block, isSelected, onClick, onChange, onFocus, zoom = 1 }: { block: BlockData, isSelected: boolean, onClick: () => void, onChange: (id: string, u: Partial<BlockData>) => void, onFocus?: () => void, zoom?: number }) {
    const onMD = (e: React.MouseEvent) => {
        if (["TEXTAREA", "INPUT", "BUTTON"].includes((e.target as HTMLElement).tagName)) return;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const initX = block.x || 0;
        const initY = block.y || 0;

        const onMM = (me: MouseEvent) => {
            const dx = (me.clientX - startX) / zoom;
            const dy = (me.clientY - startY) / zoom;
            onChange(block.id || "", { x: Math.max(0, initX + dx), y: Math.max(0, initY + dy) });
        };

        const onMU = () => {
            window.removeEventListener("mousemove", onMM);
            window.removeEventListener("mouseup", onMU);
        };

        window.addEventListener("mousemove", onMM);
        window.addEventListener("mouseup", onMU);
        onClick(); // Select it on mouse down!
    };
\;

code = code.replace(regex, replacement);

// Next we need to attach onMouseDown={onMD} instead of ref={dragRef} on the header div!
// Let's find: 	itle="Drag to move block"\n                  ref={dragRef}
code = code.replace(
    /title="Drag to move block"\\n\\s+ref=\{dragRef\}/m,
    'title="Drag to move block"\n                  onMouseDown={onMD}'
);

fs.writeFileSync('components/CanvasBlocks.tsx', code);
