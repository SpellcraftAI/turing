import { resolve } from "path";
import { testWithClaude, testWithGPT } from "./models";
import type { Config, Test } from "./types";
import { loadJSONFile, loadJSONLFile, loadModuleFile, loadTextFile, writeTestFile } from "./utils";
import { tqdm } from "./progress";
import { backoff } from "./backoff";

const MODEL = process.argv[3] || "anthropic";
const TEST_ID = process.argv[4] || "automata";

interface ChallengeOptions {
  config: Config;
  tests: Test[];
  prompt: string;
  evaluator: (...args: string[]) => string | Promise<string>;
  worker?: number;
}

async function runChallenge({
  config,
  tests,
  prompt,
  evaluator,
  worker = 0
}: ChallengeOptions) {
  const model = config.models[MODEL];
  const main = worker === 0;

  const { input } = tests[Math.floor(Math.random() * tests.length)];
  const args = input.trim().split("\n");

  console.log("Getting solution...")
  const solution = await evaluator(...args);

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
    system: `${prompt}\n---\nBEGIN RESPONSE WITH: ${startToken}\n`, 
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

async function runBatch(options: ChallengeOptions, n: number) {
  let promises: ReturnType<typeof runChallenge>[] = [];
  for (let i = 0; i < n; i++) {
    promises.push(
      backoff(() => runChallenge({ ...options, worker: i }))
    );
  }

  return Promise.all(promises);
}

export async function test(runs = 50, batchSize = 1) {
  const prompt = await loadTextFile("prompt.txt");
  const config = await loadJSONFile<Config>("config.json");
  const tests = await loadJSONLFile<Test>("test.jsonl");
  const { default: evaluator } = await loadModuleFile("eval.ts");

  if (!evaluator) {
    throw new Error("Failed to load the evaluator.")
  }

  let correct = 0;
  const numBatches = Math.ceil(runs / batchSize);

  for (const batch of tqdm((new Array(numBatches)).keys())) {
    const start = batch * batchSize;
    const end = Math.min(start + batchSize, runs);
    const remainingRuns = runs - start;
    const adjustedBatchSize = Math.min(batchSize, remainingRuns);

    const results = await runBatch(
      {
        config,
        tests,
        prompt,
        evaluator,
      }, 
      adjustedBatchSize
    );

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

  console.log('');
  console.log("--- Final score ---");
  console.log(`${correct} / ${runs} (${(100 * correct / runs).toFixed(2)}%)`);
  console.log();
}