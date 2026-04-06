const fs = require('fs');
let code = fs.readFileSync('components/CanvasBlocks.tsx', 'utf8');

const targetStr = \xport function CanvasBlock({ block, isSelected, onClick, onChange, onFocus }: { block: BlockData, isSelected: boolean, onClick: () => void, onChange: (id: string, u: Partial<BlockData>) => void, onFocus?: () => void }) {
    const dragRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = dragRef.current;
        if (!el) return;

        let dragging = false;
        let start = { x: 0, y: 0 };
        let init = { x: 0, y: 0 };

        const onMD = (e: MouseEvent) => {
            dragging = true;
            start = { x: e.clientX, y: e.clientY };
            init = { x: block.x || 0, y: block.y || 0 };
            e.stopPropagation();
        };

        const onMM = (e: MouseEvent) => {
            if (!dragging) return;
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            onChange(block.id || "", { x: Math.max(0, init.x + dx), y: Math.max(0, init.y + dy) });
        };

        const onMU = () => { dragging = false; };

        el.addEventListener("mousedown", onMD);
        window.addEventListener("mousemove", onMM);
        window.addEventListener("mouseup", onMU);

        return () => {
            el.removeEventListener("mousedown", onMD);
            window.removeEventListener("mousemove", onMM);
            window.removeEventListener("mouseup", onMU);
        };
    }, [block.id, block.x, block.y, onChange]);\;

const newStr = \xport function CanvasBlock({ block, isSelected, onClick, onChange, onFocus, zoom = 1 }: { block: BlockData, isSelected: boolean, onClick: () => void, onChange: (id: string, u: Partial<BlockData>) => void, onFocus?: () => void, zoom?: number }) {
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
    };\;

// Try exact string replacement (might fail due to whitespace variations, so let's fallback to regex if need be, but we can do index of instead)

const startIndex = code.indexOf('export function CanvasBlock(');
const endIndex = code.indexOf('    const Cmp = RENDERERS');
if (startIndex !== -1 && endIndex !== -1) {
    code = code.substring(0, startIndex) + newStr + '\n\n' + code.substring(endIndex);
    fs.writeFileSync('components/CanvasBlocks.tsx', code);
    console.log("Successfully replaced!");
} else {
    console.log(startIndex, endIndex);
}
