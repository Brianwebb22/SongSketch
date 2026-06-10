import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

export interface QuickTool {
  id: string;
  label: string;
  icon: ComponentChildren;
  onSelect: () => void;
}

interface QuickToolsProps {
  tools: QuickTool[];
}

const FAB_SIZE = 56;
const TOOL_SIZE = 44;
const RADIUS = 92;
const DRAG_THRESHOLD = 5;
const EDGE_PADDING = 8;
const STORAGE_KEY = 'songsketch-quicktools-position';

interface Position {
  x: number;
  y: number;
}

function clampToViewport(pos: Position): Position {
  const maxX = window.innerWidth - FAB_SIZE - EDGE_PADDING;
  const maxY = window.innerHeight - FAB_SIZE - EDGE_PADDING;
  return {
    x: Math.max(EDGE_PADDING, Math.min(maxX, pos.x)),
    y: Math.max(EDGE_PADDING, Math.min(maxY, pos.y)),
  };
}

function loadPosition(): Position {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Position;
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return clampToViewport(parsed);
      }
    }
  } catch {
    // ignore parse errors
  }
  // Default: bottom-right
  return clampToViewport({
    x: window.innerWidth - FAB_SIZE - 24,
    y: window.innerHeight - FAB_SIZE - 24,
  });
}

// Place tools in an arc whose center direction points toward the viewport
// center (so the menu opens "into" the screen). Arc width grows with tool
// count. For corner placements this naturally swings the menu inward.
function getToolAngles(count: number, fabCenter: Position): number[] {
  if (count === 0) return [];

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const dx = vw / 2 - fabCenter.x;
  const dy = vh / 2 - fabCenter.y;
  const centerAngle = Math.atan2(dy, dx);

  if (count === 1) return [centerAngle];

  // Spread: 60° per extra tool, capped at 300° so tools don't overlap the FAB.
  const spread = Math.min(Math.PI * 5 / 3, ((count - 1) * Math.PI) / 3);
  const start = centerAngle - spread / 2;
  const step = spread / (count - 1);
  return Array.from({ length: count }, (_, i) => start + step * i);
}

export function QuickTools({ tools }: QuickToolsProps) {
  const [pos, setPos] = useState<Position>(() => loadPosition());
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const pointerStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const movedRef = useRef(false);
  const fabRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Persist position
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } catch {
      // ignore quota errors
    }
  }, [pos]);

  // Re-clamp on viewport resize
  useEffect(() => {
    function onResize() {
      setPos((p) => clampToViewport(p));
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function onPointerDown(e: PointerEvent) {
    if (!fabRef.current) return;
    fabRef.current.setPointerCapture(e.pointerId);
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: e.clientX - pos.x,
      offsetY: e.clientY - pos.y,
    };
    movedRef.current = false;
  }

  function onPointerMove(e: PointerEvent) {
    const start = pointerStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!movedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      movedRef.current = true;
      setDragging(true);
      // Close the menu when a drag begins
      if (open) setOpen(false);
    }
    if (movedRef.current) {
      setPos(clampToViewport({
        x: e.clientX - start.offsetX,
        y: e.clientY - start.offsetY,
      }));
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (!fabRef.current) return;
    try {
      fabRef.current.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const wasDrag = movedRef.current;
    pointerStartRef.current = null;
    movedRef.current = false;
    setDragging(false);
    if (!wasDrag) {
      setOpen((v) => !v);
    }
  }

  const fabCenter = { x: pos.x + FAB_SIZE / 2, y: pos.y + FAB_SIZE / 2 };
  const angles = getToolAngles(tools.length, fabCenter);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      {/* Tool buttons (rendered first so the FAB sits above them) */}
      {tools.map((tool, i) => {
        const angle = angles[i] ?? 0;
        const tx = open ? Math.cos(angle) * RADIUS : 0;
        const ty = open ? Math.sin(angle) * RADIUS : 0;
        return (
          <button
            key={tool.id}
            onClick={() => {
              tool.onSelect();
              setOpen(false);
            }}
            aria-label={tool.label}
            title={tool.label}
            style={{
              position: 'absolute',
              left: fabCenter.x - TOOL_SIZE / 2,
              top: fabCenter.y - TOOL_SIZE / 2,
              width: TOOL_SIZE,
              height: TOOL_SIZE,
              borderRadius: '50%',
              backgroundColor: 'var(--color-surface-card)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-surface-hover)',
              boxShadow: open ? '0 4px 12px rgba(0,0,0,0.4)' : 'none',
              transform: `translate(${tx}px, ${ty}px) scale(${open ? 1 : 0.4})`,
              opacity: open ? 1 : 0,
              transition:
                'transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 180ms ease',
              pointerEvents: open ? 'auto' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            {tool.icon}
            <span
              style={{
                position: 'absolute',
                top: '50%',
                right: TOOL_SIZE + 8,
                transform: 'translateY(-50%)',
                whiteSpace: 'nowrap',
                fontSize: 12,
                fontWeight: 500,
                padding: '4px 8px',
                borderRadius: 6,
                backgroundColor: 'var(--color-surface-card)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-surface-hover)',
                opacity: open ? 1 : 0,
                transition: 'opacity 180ms ease',
                pointerEvents: 'none',
              }}
            >
              {tool.label}
            </span>
          </button>
        );
      })}

      {/* FAB */}
      <button
        ref={fabRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={open ? 'Close quick tools' : 'Open quick tools'}
        aria-expanded={open}
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: '50%',
          backgroundColor: 'var(--color-accent)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 6px 16px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.2)',
          cursor: dragging ? 'grabbing' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          touchAction: 'none',
          userSelect: 'none',
          transition: dragging ? 'none' : 'transform 220ms ease, background-color 180ms ease',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          pointerEvents: 'auto',
        }}
      >
        {/* Plus / sparkle icon — rotates to × when open */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
