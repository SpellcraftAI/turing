
import { writeFile } from "fs/promises";

import { askClaude, askGPT } from "./models.mjs";
import { instances } from "./tokens.mjs"
import { loadUserFile, normal, show } from "./utils.mjs";
import { tqdm } from "./progress.mjs";
import { backoff } from "./backoff.mjs";

const USER = process.argv[2] || "futuristfrog";
const MODEL = process.argv[3] || "anthropic";

const prompt = await loadUserFile(USER, "prompt.txt");
const config = await loadUserFile(USER, "config.json");

let OUTPUT = "";

function LOG(txt) { 
  if (txt) { 
    OUTPUT += txt+"\n"; 
    console.log(txt); 
  } 
}

// Evaluator
// ---------

async function runChallenge(system, level, worker = 0) {
  let output = ""
  const log = (string) => output += string;

  const model = config.models[MODEL];
  const main = worker === 0;

  const term = instances[level][Math.floor(Math.random() * instances[level].length)];
  const [norm, rwts] = normal(term);
  const problem = show(term);
  const params = { model, debug: true, worker, main, ...config };

  console.log();
  console.table(params);

  log(`Term: ${show(term)}`);
  log(`Norm: ${show(norm)}`);
  log(`Rwts: ${rwts}`);
  log(``);
  log(`Response:`);

  let endpoint = model.startsWith("gpt") ? askGPT : askClaude;
  console.log(`Starting worker ${worker}...`)
  let { text, metadata } = await endpoint({ 
    system, 
    messages: [{ role: 'user', content: problem }],
    main,
    ...params 
  });

  const lines = text.split("\n")
  const solution = lines[lines.length - 1].trim()
  const received = solution.split(' ').filter(Boolean);

  log(`\nRECEIVED: ${show(received)}\n`);
  if (received.join('').trim() === norm.join('').trim()) {
    log('--CORRECT--\n');
  } else {
    log('--INCORRECT--\n');
    console.log(output);
    await writeFile("error.txt", output)
  }

  const pass = norm.join('').trim() === received.join('').trim()

  return {
    pass,
    metadata
  }
}

async function runBatch(systemPrompt, n = 1) {
  let promises = [];
  for (let i = 0; i < n; i++) {
    promises.push(
      backoff(() => runChallenge(systemPrompt, 24, i))
    );
  }

  return Promise.all(promises);
}

async function runFullChallenge(systemPrompt, runs = 50, batchSize = 1) {
  let correct = 0;
  const numBatches = Math.ceil(runs / batchSize);

  for (const batch of tqdm((new Array(numBatches)).keys())) {
    let startTime = Date.now();
    const start = batch * batchSize;
    const end = Math.min(start + batchSize, runs);

    const results = await runBatch(systemPrompt, batchSize);

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

    const waitTime = 60;
    console.log(`${waitTime} second cooldown...`);
    await new Promise(resolve => setTimeout(resolve, waitTime * 1000))
  }

  LOG('');
  LOG("--- Final score ---");
  LOG(`${correct} / ${runs} (${(100 * correct / runs).toFixed(2)}%)`);
  console.log();
}

await runFullChallenge(prompt, 400, 6);
// await writeFile(`./users/${USER}/log.txt`, OUTPUT);
