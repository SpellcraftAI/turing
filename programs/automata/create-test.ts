// { "input": "0000000010\n26\n10" }
// { "input": "0001000010\n18\n10" }
// { "input": "0001010010\n30\n10" }
// { "input": "0101000010\n22\n10" }

import { writeFile } from "fs/promises"
import { resolve, dirname } from "path"
import { formatTape, Tape } from "./eval";
import { shuffle } from "../../src/utils";

const TEST_JSONL = resolve(
  dirname(Bun.main),
  "tests.jsonl"
)

await writeFile(TEST_JSONL, "");

type Example = {
  input: string;
}

const examples: Example[] = []

for (let i = 0; i < 256; i++) {
  const input: Tape = Array(10).fill(0);
  input[Math.floor(Math.random() * input.length)] = 1;

  examples.push({
    input: `${formatTape(input)}\n${i}\n9`
  })
}

for (const example of shuffle(examples)) {
  await writeFile(TEST_JSONL, JSON.stringify(example) + "\n", { flag: "a" });
}

