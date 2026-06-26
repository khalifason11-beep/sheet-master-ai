// Minimal Excel-like formula engine for in-browser lessons.
// Supports: literals, cell refs (A1), ranges (A1:B5), arithmetic + - * / ^,
// comparisons, strings, and functions SUM AVERAGE COUNT MIN MAX IF SUMIF
// COUNTIF AVERAGEIF VLOOKUP XLOOKUP CONCAT TEXTJOIN ROUND ABS.

export type CellValue = string | number | boolean | null;
export type Grid = CellValue[][];

const colToIndex = (col: string) => {
  let n = 0;
  for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

export const indexToCol = (i: number) => {
  let s = "";
  i++;
  while (i > 0) {
    const r = (i - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
};

export const parseRef = (ref: string) => {
  const m = /^\$?([A-Z]+)\$?(\d+)$/i.exec(ref);
  if (!m) return null;
  return { col: colToIndex(m[1]), row: parseInt(m[2], 10) - 1 };
};

const getCell = (grid: Grid, ref: string): CellValue => {
  const p = parseRef(ref);
  if (!p) return null;
  return grid[p.row]?.[p.col] ?? null;
};

const getRange = (grid: Grid, range: string): CellValue[] => {
  const [a, b] = range.split(":");
  const pa = parseRef(a)!;
  const pb = parseRef(b)!;
  const out: CellValue[] = [];
  for (let r = Math.min(pa.row, pb.row); r <= Math.max(pa.row, pb.row); r++) {
    for (let c = Math.min(pa.col, pb.col); c <= Math.max(pa.col, pb.col); c++) {
      out.push(grid[r]?.[c] ?? null);
    }
  }
  return out;
};

const toNum = (v: CellValue): number => {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v == null || v === "") return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const matches = (v: CellValue, criteria: string): boolean => {
  const c = criteria.toString().trim();
  const ops = ["<=", ">=", "<>", "<", ">", "="];
  for (const op of ops) {
    if (c.startsWith(op)) {
      const rhs = c.slice(op.length).trim();
      const rn = Number(rhs);
      const vn = toNum(v);
      if (!isNaN(rn)) {
        if (op === "<=") return vn <= rn;
        if (op === ">=") return vn >= rn;
        if (op === "<") return vn < rn;
        if (op === ">") return vn > rn;
        if (op === "=") return vn === rn;
        if (op === "<>") return vn !== rn;
      } else {
        const s = String(v ?? "");
        if (op === "=") return s === rhs;
        if (op === "<>") return s !== rhs;
      }
    }
  }
  return String(v ?? "").toLowerCase() === c.toLowerCase();
};

const FUNCS: Record<string, (args: any[], grid: Grid) => CellValue> = {
  SUM: (args) => args.flat().reduce((s: number, v) => s + toNum(v), 0),
  AVERAGE: (args) => {
    const flat = args.flat().filter((v) => v !== null && v !== "");
    if (!flat.length) return 0;
    return flat.reduce((s: number, v) => s + toNum(v), 0) / flat.length;
  },
  COUNT: (args) => args.flat().filter((v) => typeof v === "number" || (!isNaN(Number(v)) && v !== "" && v !== null)).length,
  COUNTA: (args) => args.flat().filter((v) => v !== null && v !== "").length,
  MIN: (args) => Math.min(...args.flat().map(toNum)),
  MAX: (args) => Math.max(...args.flat().map(toNum)),
  ROUND: (args) => {
    const n = toNum(args[0]);
    const d = toNum(args[1] ?? 0);
    const f = Math.pow(10, d);
    return Math.round(n * f) / f;
  },
  ABS: (args) => Math.abs(toNum(args[0])),
  IF: (args) => {
    const cond = args[0];
    const truthy = typeof cond === "boolean" ? cond : toNum(cond) !== 0;
    return truthy ? (args[1] ?? null) : (args[2] ?? false);
  },
  AND: (args) => args.flat().every((v) => (typeof v === "boolean" ? v : toNum(v) !== 0)),
  OR: (args) => args.flat().some((v) => (typeof v === "boolean" ? v : toNum(v) !== 0)),
  NOT: (args) => !(typeof args[0] === "boolean" ? args[0] : toNum(args[0]) !== 0),
  SUMIF: (args) => {
    const range = args[0] as CellValue[];
    const criteria = String(args[1]);
    const sumRange = (args[2] as CellValue[]) ?? range;
    let total = 0;
    range.forEach((v, i) => {
      if (matches(v, criteria)) total += toNum(sumRange[i]);
    });
    return total;
  },
  COUNTIF: (args) => {
    const range = args[0] as CellValue[];
    const criteria = String(args[1]);
    return range.filter((v) => matches(v, criteria)).length;
  },
  AVERAGEIF: (args) => {
    const range = args[0] as CellValue[];
    const criteria = String(args[1]);
    const avgRange = (args[2] as CellValue[]) ?? range;
    const vals = range.map((v, i) => (matches(v, criteria) ? toNum(avgRange[i]) : null)).filter((v) => v !== null) as number[];
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  },
  CONCAT: (args) => args.flat().map((v) => (v == null ? "" : String(v))).join(""),
  CONCATENATE: (args) => args.flat().map((v) => (v == null ? "" : String(v))).join(""),
  TEXTJOIN: (args) => {
    const delim = String(args[0] ?? "");
    const ignoreEmpty = !!args[1];
    const rest = args.slice(2).flat();
    const filtered = ignoreEmpty ? rest.filter((v) => v !== null && v !== "") : rest;
    return filtered.map((v) => String(v ?? "")).join(delim);
  },
  UPPER: (args) => String(args[0] ?? "").toUpperCase(),
  LOWER: (args) => String(args[0] ?? "").toLowerCase(),
  LEN: (args) => String(args[0] ?? "").length,
  VLOOKUP: (args) => {
    const lookup = args[0];
    const table = args[1] as CellValue[][];
    const col = toNum(args[2]) - 1;
    for (const row of table) {
      if (String(row[0]) === String(lookup)) return row[col] ?? null;
    }
    return "#N/A";
  },
  XLOOKUP: (args) => {
    const lookup = args[0];
    const lookupArr = args[1] as CellValue[];
    const returnArr = args[2] as CellValue[];
    const fallback = args[3] ?? "#N/A";
    const idx = lookupArr.findIndex((v) => String(v) === String(lookup));
    return idx >= 0 ? returnArr[idx] ?? null : fallback;
  },
};

// Tokenizer
type Token =
  | { type: "num"; value: number }
  | { type: "str"; value: string }
  | { type: "bool"; value: boolean }
  | { type: "ident"; value: string }
  | { type: "ref"; value: string }
  | { type: "range"; value: string }
  | { type: "op"; value: string }
  | { type: "lp" }
  | { type: "rp" }
  | { type: "comma" };

const tokenize = (input: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"') {
      let s = "";
      i++;
      while (i < input.length && input[i] !== '"') { s += input[i++]; }
      i++;
      tokens.push({ type: "str", value: s });
      continue;
    }
    if (c === "(") { tokens.push({ type: "lp" }); i++; continue; }
    if (c === ")") { tokens.push({ type: "rp" }); i++; continue; }
    if (c === ",") { tokens.push({ type: "comma" }); i++; continue; }
    if ("+-*/^".includes(c)) { tokens.push({ type: "op", value: c }); i++; continue; }
    if (c === "<" || c === ">" || c === "=") {
      const next = input[i + 1];
      if ((c === "<" && (next === "=" || next === ">")) || (c === ">" && next === "=")) {
        tokens.push({ type: "op", value: c + next });
        i += 2;
        continue;
      }
      tokens.push({ type: "op", value: c });
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let s = "";
      while (i < input.length && /[0-9.]/.test(input[i])) s += input[i++];
      tokens.push({ type: "num", value: parseFloat(s) });
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let s = "";
      while (i < input.length && /[A-Za-z0-9_$]/.test(input[i])) s += input[i++];
      const upper = s.toUpperCase();
      if (upper === "TRUE") { tokens.push({ type: "bool", value: true }); continue; }
      if (upper === "FALSE") { tokens.push({ type: "bool", value: false }); continue; }
      // ref or range
      const refRe = /^\$?[A-Z]+\$?[0-9]+$/i;
      if (refRe.test(s) && input[i] === ":") {
        i++;
        let s2 = "";
        while (i < input.length && /[A-Za-z0-9_$]/.test(input[i])) s2 += input[i++];
        tokens.push({ type: "range", value: `${s}:${s2}` });
      } else if (refRe.test(s)) {
        tokens.push({ type: "ref", value: s });
      } else {
        tokens.push({ type: "ident", value: upper });
      }
      continue;
    }
    throw new Error(`Unexpected character ${c}`);
  }
  return tokens;
};

// Pratt-ish parser
class Parser {
  i = 0;
  constructor(public tokens: Token[]) {}
  peek() { return this.tokens[this.i]; }
  consume() { return this.tokens[this.i++]; }
  parseExpr(prec = 0): any {
    let left = this.parsePrimary();
    while (true) {
      const t = this.peek();
      if (!t || t.type !== "op") break;
      const opPrec = precedence(t.value);
      if (opPrec < prec) break;
      this.consume();
      const right = this.parseExpr(opPrec + 1);
      left = { type: "bin", op: t.value, left, right };
    }
    return left;
  }
  parsePrimary(): any {
    const t = this.consume();
    if (!t) throw new Error("Unexpected end");
    if (t.type === "num") return { type: "num", value: t.value };
    if (t.type === "str") return { type: "str", value: t.value };
    if (t.type === "bool") return { type: "bool", value: t.value };
    if (t.type === "ref") return { type: "ref", value: t.value };
    if (t.type === "range") return { type: "range", value: t.value };
    if (t.type === "op" && t.value === "-") {
      const e = this.parsePrimary();
      return { type: "neg", value: e };
    }
    if (t.type === "lp") {
      const e = this.parseExpr();
      const close = this.consume();
      if (!close || close.type !== "rp") throw new Error("Expected )");
      return e;
    }
    if (t.type === "ident") {
      const next = this.peek();
      if (next && next.type === "lp") {
        this.consume();
        const args: any[] = [];
        if (this.peek() && this.peek().type !== "rp") {
          args.push(this.parseExpr());
          while (this.peek() && this.peek().type === "comma") {
            this.consume();
            args.push(this.parseExpr());
          }
        }
        const close = this.consume();
        if (!close || close.type !== "rp") throw new Error("Expected )");
        return { type: "call", name: t.value, args };
      }
      return { type: "ident", value: t.value };
    }
    throw new Error("Unexpected token");
  }
}
const precedence = (op: string) => {
  if (["<", ">", "<=", ">=", "=", "<>"].includes(op)) return 1;
  if (op === "+" || op === "-") return 2;
  if (op === "*" || op === "/") return 3;
  if (op === "^") return 4;
  return 0;
};

const evalNode = (node: any, grid: Grid): CellValue | CellValue[] | CellValue[][] => {
  switch (node.type) {
    case "num": return node.value;
    case "str": return node.value;
    case "bool": return node.value;
    case "ref": return getCell(grid, node.value);
    case "range": return getRange(grid, node.value);
    case "neg": return -toNum(evalNode(node.value, grid) as CellValue);
    case "bin": {
      const l = evalNode(node.left, grid) as CellValue;
      const r = evalNode(node.right, grid) as CellValue;
      switch (node.op) {
        case "+": return toNum(l) + toNum(r);
        case "-": return toNum(l) - toNum(r);
        case "*": return toNum(l) * toNum(r);
        case "/": return toNum(r) === 0 ? "#DIV/0!" : toNum(l) / toNum(r);
        case "^": return Math.pow(toNum(l), toNum(r));
        case "=": return String(l) === String(r) || toNum(l) === toNum(r);
        case "<>": return !(String(l) === String(r));
        case "<": return toNum(l) < toNum(r);
        case ">": return toNum(l) > toNum(r);
        case "<=": return toNum(l) <= toNum(r);
        case ">=": return toNum(l) >= toNum(r);
      }
      return null;
    }
    case "call": {
      const fn = FUNCS[node.name];
      if (!fn) return "#NAME?";
      const args = node.args.map((a: any) => evalNode(a, grid));
      try { return fn(args, grid) as CellValue; } catch { return "#ERROR!"; }
    }
  }
  return null;
};

export const evaluate = (raw: string, grid: Grid): CellValue => {
  if (!raw || typeof raw !== "string" || !raw.startsWith("=")) return raw as CellValue;
  try {
    const tokens = tokenize(raw.slice(1));
    const parser = new Parser(tokens);
    const ast = parser.parseExpr();
    const result = evalNode(ast, grid);
    if (Array.isArray(result)) return Array.isArray(result[0]) ? (result[0] as any)[0] : (result as any)[0];
    return result as CellValue;
  } catch {
    return "#ERROR!";
  }
};

export const normalize = (val: CellValue): string => {
  if (val == null || val === "") return "";
  if (typeof val === "number") {
    return Number.isInteger(val) ? String(val) : String(Math.round(val * 1e6) / 1e6);
  }
  return String(val);
};
