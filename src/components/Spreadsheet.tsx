import { useState, useMemo, useEffect } from "react";
import { evaluate, indexToCol, normalize, parseRef, type CellValue, type Grid } from "@/lib/formula-engine";
import { cn } from "@/lib/utils";
import { Check, X, RotateCcw } from "lucide-react";

interface SpreadsheetProps {
  initial: (string | number)[][];
  rows?: number;
  cols?: number;
  expectedFormula?: string;
  expectedValue?: number | string;
  targetCell?: string;
  onSolve?: () => void;
}

const cellEq = (a: CellValue, b: number | string | undefined) => {
  if (b === undefined) return false;
  if (typeof b === "number" && typeof a === "number") return Math.abs(a - b) < 0.01;
  return String(a).toLowerCase().trim() === String(b).toLowerCase().trim();
};

export function Spreadsheet({
  initial,
  rows = 8,
  cols = 5,
  expectedFormula,
  expectedValue,
  targetCell,
  onSolve,
}: SpreadsheetProps) {
  const buildInitial = (): { raw: string; }[][] => {
    const g: { raw: string }[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: { raw: string }[] = [];
      for (let c = 0; c < cols; c++) {
        const v = initial[r]?.[c];
        row.push({ raw: v === undefined || v === null ? "" : String(v) });
      }
      g.push(row);
    }
    return g;
  };

  const [grid, setGrid] = useState(buildInitial);
  const [active, setActive] = useState<{ r: number; c: number } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  useEffect(() => {
    setGrid(buildInitial());
    setActive(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initial), rows, cols]);

  const evaluatedGrid: Grid = useMemo(() => {
    const numeric: Grid = grid.map((row) =>
      row.map((cell) => {
        const v = cell.raw;
        if (v === "") return null;
        if (!isNaN(Number(v)) && !v.startsWith("=")) return Number(v);
        return v;
      }),
    );
    const evaluated: Grid = numeric.map((row) => row.slice());
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const raw = grid[r][c].raw;
        if (raw.startsWith("=")) evaluated[r][c] = evaluate(raw, evaluated);
      }
    }
    return evaluated;
  }, [grid]);

  const targetPos = targetCell ? parseRef(targetCell) : null;
  const targetRaw = targetPos ? grid[targetPos.row]?.[targetPos.col]?.raw ?? "" : "";
  const targetEvaluated = targetPos ? evaluatedGrid[targetPos.row]?.[targetPos.col] : null;
  const correct = expectedValue !== undefined && targetPos
    ? cellEq(targetEvaluated, expectedValue)
    : false;

  useEffect(() => {
    if (correct) onSolve?.();
  }, [correct, onSolve]);

  const startEdit = (r: number, c: number) => {
    setActive({ r, c });
    setEditValue(grid[r][c].raw);
  };

  const commit = () => {
    if (!active) return;
    setGrid((prev) => {
      const next = prev.map((row) => row.map((cell) => ({ ...cell })));
      next[active.r][active.c].raw = editValue;
      return next;
    });
  };

  const reset = () => setGrid(buildInitial());

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-2/60 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="rounded bg-background px-2 py-1 font-semibold">
            {active ? `${indexToCol(active.c)}${active.r + 1}` : targetCell ?? "A1"}
          </span>
          <input
            value={active ? editValue : targetPos ? grid[targetPos.row]?.[targetPos.col]?.raw ?? "" : ""}
            placeholder="Type a value or =FORMULA"
            onChange={(e) => setEditValue(e.target.value)}
            onFocus={() => { if (!active && targetPos) startEdit(targetPos.row, targetPos.col); }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") { commit(); (e.target as HTMLInputElement).blur(); }
            }}
            className="flex-1 rounded border border-input bg-background px-2 py-1 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button onClick={reset} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent">
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-10 border-b border-r border-border bg-surface-2 text-center text-xs font-medium text-muted-foreground" />
              {Array.from({ length: cols }).map((_, c) => (
                <th key={c} className="min-w-24 border-b border-r border-border bg-surface-2 px-3 py-1.5 text-center text-xs font-semibold text-muted-foreground">
                  {indexToCol(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, r) => (
              <tr key={r}>
                <th className="sticky left-0 w-10 border-b border-r border-border bg-surface-2 text-center text-xs font-medium text-muted-foreground">{r + 1}</th>
                {row.map((cell, c) => {
                  const isActive = active?.r === r && active?.c === c;
                  const isTarget = targetPos?.row === r && targetPos?.col === c;
                  const display = isActive
                    ? editValue
                    : cell.raw.startsWith("=")
                      ? normalize(evaluatedGrid[r][c])
                      : cell.raw;
                  return (
                    <td
                      key={c}
                      onClick={() => startEdit(r, c)}
                      className={cn(
                        "min-w-24 cursor-text border-b border-r border-border bg-card px-3 py-1.5 font-mono text-xs",
                        isTarget && "bg-accent/40 ring-1 ring-inset ring-primary/40",
                        isActive && "ring-2 ring-ring",
                        typeof evaluatedGrid[r][c] === "number" && "text-right",
                      )}
                    >
                      {isActive ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => { commit(); setActive(null); }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { commit(); setActive(null); }
                            if (e.key === "Escape") setActive(null);
                          }}
                          className="w-full bg-transparent outline-none"
                        />
                      ) : (
                        <span className={cn(typeof display === "string" && display.startsWith("#") && "text-destructive")}>{display}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {expectedValue !== undefined && (
        <div className={cn(
          "flex items-center justify-between gap-3 border-t border-border px-3 py-2.5 text-xs",
          correct ? "bg-success/10 text-success" : "bg-muted/40 text-muted-foreground",
        )}>
          <div className="flex items-center gap-2">
            {correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4 opacity-50" />}
            <span className="font-medium">
              {correct
                ? `Nice — cell ${targetCell} = ${expectedValue}`
                : `Target: ${targetCell} should equal ${expectedValue}`}
            </span>
          </div>
          {expectedFormula && !correct && (
            <code className="hidden rounded bg-background px-2 py-1 font-mono text-[11px] text-foreground/70 sm:inline">
              hint: try {expectedFormula}
            </code>
          )}
        </div>
      )}
    </div>
  );
}
