import { existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "bun";

export type TextFile = `${string}.txt`;
export type JSONFile = `${string}.json`;
export type JSONLFile = `${string}.jsonl`;
export type TSFile = `${string}.ts`;

export type TestFile = TextFile | JSONFile | JSONLFile | TSFile;

export const isTextFile = (file: TestFile): file is TextFile => file.endsWith(".txt");
export const isJSONFile = (file: TestFile): file is JSONFile => file.endsWith(".json");
export const isJSONLFile = (file: TestFile): file is JSONLFile => file.endsWith(".jsonl");
export const isTSFile = (file: TestFile): file is TSFile => file.endsWith(".ts");

export const loadTextFile = async (importMeta: ImportMeta, file: TextFile) => {
  const path = resolve(importMeta.dirname, file);
  return (await readFile(path, "utf-8")).trim();
}

export const loadJSONFile = async <T>(importMeta: ImportMeta, file: JSONFile) => {
  const path = resolve(importMeta.dirname, file);
  const contents = (await readFile(path, "utf-8")).trim();
  return JSON.parse(contents) as T;
}

export const loadJSONLFile = async <T>(importMeta: ImportMeta, file: JSONLFile) => {
  const path = resolve(importMeta.dirname, file);
  const contents = (await readFile(path, "utf-8")).trim();
  return contents.split("\n").map((line) => JSON.parse(line)) as T[];
}

export const loadModuleFile = async (importMeta: ImportMeta, file: TSFile) => {
  const path = resolve(importMeta.dirname, file);
  return await import(path);
}


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