import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { readFile, writeFile } from "fs/promises";
import { tokens, AH, HA, BH, HB, Value, Instance } from "./tokens";

export const writeTestFile = async (
  id: string,
  path: string,
  contents: string
) => {
  const fullPath = resolve("logs", id, path);
  const logDir = resolve("logs", id);

  if (existsSync(logDir) === false) {
    mkdirSync(logDir, { recursive: true });
  }

  return await writeFile(fullPath, contents);
}

export const loadTestFile = async (id: string, file: string): Promise<any> => {
  const path = resolve("programs", id, file);
  const contents = (await readFile(path, "utf-8")).trim();

  if (file.endsWith(".ts")) {
    return await import(path);
  } else if (file.endsWith(".jsonl")) {
    return contents.split("\n").map((line) => JSON.parse(line));
  } else if (file.endsWith(".json")) {
    return JSON.parse(contents);
  }

  return contents;
};

export function reduce(xs: Value[]): [Value[], number] {
  let ys: Value[] = [];
  let rwts = 0;
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] === AH && xs[i + 1] === HB) {
      ys.push(HB, AH);
      i++;
      rwts++;
    } else if (xs[i] === BH && xs[i + 1] === HA) {
      ys.push(HA, BH);
      i++;
      rwts++;
    } else if (xs[i] === AH && xs[i + 1] === HA) {
      i++;
      rwts++;
    } else if (xs[i] === BH && xs[i + 1] === HB) {
      i++;
      rwts++;
    } else {
      ys.push(xs[i]);
    }
  }
  return [ys, rwts];
}

export function normal(xs: Value[]): [Value[], number] {
  let rwts = 0;
  let term = xs;
  let work: number;
  while (true) {
    [term, work] = reduce(term);
    if (work > 0) {
      rwts += work;
    } else {
      break;
    }
  }
  return [term, rwts];
}

export function randomTerm(): Value[] {
  const result: Value[] = [];
  for (let i = 0; i < 12; i++) {
    result.push(tokens[Math.floor(Math.random() * tokens.length)]);
  }
  return result;
}

export function show(xs: string[]): string {
  return xs
    .map((x) => {
      switch (x) {
        case HA:
          return "#A ";
        case HB:
          return "#B ";
        case AH:
          return "A# ";
        case BH:
          return "B# ";
        default:
          return "";
      }
    })
    .join("");
}