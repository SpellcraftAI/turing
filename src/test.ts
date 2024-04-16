import chalk from "chalk"

import { testWithClaude, testWithGPT } from "./models";
import { Difficulty, Instance, instances } from "./tokens"
import { loadTestFile, normal, show, writeTestFile } from "./utils";
import { tqdm } from "./progress";
import { backoff } from "./backoff";
import { Config, Test } from "./types";

const MODEL = process.argv[3] || "anthropic";
const TEST_ID = process.argv[4] || "rule110";

const prompt: string = await loadTestFile(TEST_ID, "prompt.txt");
const config: Config = await loadTestFile(TEST_ID, "config.json");
const tests: Test[] = await loadTestFile(TEST_ID, "test.jsonl");
const { default: evaluator } = await loadTestFile(TEST_ID, "eval.ts");

if (!evaluator) {
  throw new Error("Failed to load the evaluator.")
}

let OUTPUT = "";

function LOG(txt: string) { 
  if (txt) { 
    OUTPUT += txt+"\n"; 
    console.log(txt); 
  } 
}

// Evaluator
// ---------

async function runChallenge(system: string, worker = 0) {
  const model = config.models[MODEL];
  const main = worker === 0;

  const { input } = tests[Math.floor(Math.random() * tests.length)];
  const args = input.trim().split("\n");

  console.log("Getting solution...")
  const solution = evaluator(...args);
  await writeTestFile(TEST_ID, "input.txt", input);
  await writeTestFile(TEST_ID, "solution.txt", solution);

  /**
   * We dope the context with a start token from the examples, and induce the
   * model to respond without deviating from the example format at any point.
   * 
   * This token will usually be TAPE, but it is done dynamically here so it's
   * more extensible in the future.
   */
  const startToken = solution.split(" ")?.[0];
  if (!startToken) {
    throw new Error("Failed to find a start token in the solution. We use the first word of the solution.");
  }

  const params = { model, debug: true, worker, main, ...config };

  console.log();
  console.table({ args });
  console.table({ startToken });
  console.table(params);
  console.log(`Starting worker ${worker}...`)

  const startTest = model.startsWith("gpt") ? testWithGPT : testWithClaude;
  let { pass, text, metadata } = await startTest({
    system: `${system}\n---\nBEGIN RESPONSE WITH: ${startToken}\n`, 
    messages: [{ role: 'user', content: input }],
    solution,
    ...params 
  });

  await writeTestFile(TEST_ID, "response.txt", text);
  return {
    pass,
    metadata
  }
}

async function runBatch(systemPrompt: string, n = 1) {
  let promises: ReturnType<typeof runChallenge>[] = [];
  for (let i = 0; i < n; i++) {
    promises.push(
      backoff(() => runChallenge(systemPrompt, i))
    );
  }

  return Promise.all(promises);
}

async function runFullChallenge(systemPrompt: string, runs = 50, batchSize = 1) {
  let correct = 0;
  const numBatches = Math.ceil(runs / batchSize);

  for (const batch of tqdm((new Array(numBatches)).keys())) {
    const start = batch * batchSize;
    const end = Math.min(start + batchSize, runs);
    const remainingRuns = runs - start;
    const adjustedBatchSize = Math.min(batchSize, remainingRuns);

    const results = await runBatch(systemPrompt, adjustedBatchSize);

    for (const result of results) {
      const { pass, metadata } = result;
      if (pass) correct++;
      if (metadata) {
        console.log();
        console.table(metadata);
      }
    }
      
    const Test = `${end} / ${runs}`;
    const Correct = `${correct} / ${end}`;
    const Accuracy = `${(correct / end).toFixed(2)}`;

    console.log();
    console.table({ Test, Correct, Accuracy });
    console.log();

    if (batch < numBatches - 1) {
      const waitTime = 60;
      console.log(`${waitTime} second cooldown...`);
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000))
    }
  }

  LOG('');
  LOG("--- Final score ---");
  LOG(`${correct} / ${runs} (${(100 * correct / runs).toFixed(2)}%)`);
  console.log();
}

await runFullChallenge(prompt, 1, 1);
