import { resolve } from "path";
import { readFile } from "fs/promises";
import { tokens, AH, HA, BH, HB } from "./tokens.mjs";

export const loadUserFile = async (user, file) => {
  const path = resolve("users", user, file);
  const contents = (await readFile(path, "utf-8")).trim()

  if (file.endsWith(".json")) {
    return JSON.parse(contents);
  }

  return contents;
}

export function reduce(xs) {
  let ys   = [];
  let work = false;
  let rwts = 0;
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] === AH && xs[i+1] === HB) {
      ys.push(HB, AH); i++; rwts++;
    } else if (xs[i] === BH && xs[i+1] === HA) {
      ys.push(HA, BH); i++; rwts++;
    } else if (xs[i] === AH && xs[i+1] === HA) {
      i++; rwts++;
    } else if (xs[i] === BH && xs[i+1] === HB) {
      i++; rwts++;
    } else {
      ys.push(xs[i]);
    }
  }
  return [ys, rwts];
}

export function normal(xs) {
  let rwts = 0;
  let term = xs;
  let work;
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

export function randomTerm() {
  const result = [];
  for (let i = 0; i < 12; i++) {
    result.push(tokens[Math.floor(Math.random() * tokens.length)]);
  }
  return result;
}

export function show(xs) {
  return xs.map(x => {
    switch (x) {
      case HA: return "#A ";
      case HB: return "#B ";
      case AH: return "A# ";
      case BH: return "B# ";
      default: return "";
    }
  }).join('');
}