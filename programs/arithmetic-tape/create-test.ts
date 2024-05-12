// { "input": "0000000010\n26\n10" }
// { "input": "0001000010\n18\n10" }
// { "input": "0001010010\n30\n10" }
// { "input": "0101000010\n22\n10" }

import { writeFile } from "fs/promises"
import { resolve, dirname } from "path"
import { toPositionalBinary } from "../utils"

const TEST_JSONL = resolve(
  dirname(Bun.main),
  "tests.jsonl"
)

await writeFile(TEST_JSONL, "")

type Example = {
  input: string;
}

const selected: Example[] = [
  { input: `${toPositionalBinary(19278)}\n${toPositionalBinary(12306)}` }
]
const examples: Example[] = []

// Add the selected examples first
for (const example of selected) {
  examples.unshift(example)
}

for (let i = 0; i < 10; i++) {
  const a = Math.floor(Math.random() * 10)
  const b = Math.floor(Math.random() * 10)
  
  examples.push({ input: `${toPositionalBinary(a)}\n${toPositionalBinary(b)}` })
}

for (const example of examples) {
  await writeFile(TEST_JSONL, JSON.stringify(example) + "\n", { flag: "a" })
}

