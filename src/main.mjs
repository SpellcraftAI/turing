import OpenAI from "openai";
import { join } from "path"
import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { Anthropic } from "@anthropic-ai/sdk";

import { instances } from "./tokens.mjs"
import { normal, show } from "./utils.mjs";

const USER = process.argv[2] || "futuristfrog";
const MODEL = process.argv[3] || "anthropic";
const RUNS = 50;

const loadUserFile = async (file) => {
  const path = resolve("users", USER, file);
  const contents = (await readFile(path, "utf-8")).trim()

  if (file.endsWith(".json")) {
    return JSON.parse(contents);
  }

  return contents;
}

const prompt = await loadUserFile("prompt.txt");
const config = await loadUserFile("config.json");

let OUTPUT = "";
function PUT(txt) { 
  if (txt) { 
    OUTPUT += txt; process.stdout.write(txt); 
  } 
}

function LOG(txt) { 
  if (txt) { 
    OUTPUT += txt+"\n"; 
    console.log(txt); 
  } 
}

// AI Utils
// --------

const { ANTHROPIC_API_KEY, OPENAI_API_KEY } = process.env

async function getAnthropicKey() {
  if (ANTHROPIC_API_KEY) {
    return ANTHROPIC_API_KEY
  }

  const keyPath = join(process.env.HOME, '.config', 'anthropic.token');
  return (await readFile(keyPath, 'utf8')).trim();
}

async function getOpenAIKey() {
  if (OPENAI_API_KEY) {
    return OPENAI_API_KEY
  }

  const keyPath = join(process.env.HOME, '.config', 'openai.token');
  return (await readFile(keyPath, 'utf8')).trim();
}

async function askClaude({ system, messages, max_tokens, model = 'claude-3-opus-20240229', temperature = 0, debug = true }) {
  const apiKey = await getAnthropicKey()  
  const anthropic = new Anthropic({ apiKey });
  
  if (debug) {
    const stream = anthropic.messages.stream({
      model,
      messages,
      max_tokens: max_tokens || 4096,
      temperature,
      ...(system && { system }),
    }).on('text', (text) => PUT(text));
    const message = await stream.finalMessage();
    const { content, ...metadata } = message;

    console.log();
    console.table(metadata);
    LOG(); // Add a newline at the end
    return content[0].text;
  } else {
    const message = await anthropic.messages.create({
      model,
      messages,
      max_tokens: max_tokens || 4096,
      temperature,
      ...(system && { system }),
    });
    return message.content[0].text;
  }
}

async function askGPT({system, messages, model, temperature}) {
  const openai = new OpenAI({apiKey: await getOpenAIKey()});
  const stream = await openai.chat.completions.create({
    model: model || "gpt-4-0125-preview",
    messages: [
      {role: "system", content: system || "You're a helpful assistant." },
      ...messages
    ],
    stream: true,
    max_tokens: 2500,
    temperature: temperature || 0,
  });
  var result = "";
  for await (const chunk of stream) {
    var text = chunk.choices[0]?.delta?.content || "";
    PUT(text);
    result += text;
  }
  PUT("\n");
  return result;
}

// Evaluator
// ---------

async function runChallenge(system, level) {
  let output = ""
  const log = (string) => output += string;

  const model = config.models[MODEL];


  const term = instances[level][Math.floor(Math.random() * instances[level].length)];
  const [norm, rwts] = normal(term);
  const problem = `INPUT: ${show(term)}`;
  const params = { model, debug: true, ...config };
  console.table(params);

  log(`Term: ${show(term)}`);
  log(`Norm: ${show(norm)}`);
  log(`Rwts: ${rwts}`);
  log(``);
  log(`Response:`);

  let ai_ask = model.startsWith("gpt") ? askGPT : askClaude;
  let ai_ret = await ai_ask({ 
    system, 
    messages: [{ role: 'user', content: problem }], 
    ...params 
  });

  const lines = ai_ret.split("\n")
  const solution = lines[lines.length - 1].trim()

  if (solution) {
    const aiSolution = solution.split(' ').filter(Boolean);
    log(`\nAI-Solution: ${show(aiSolution)}\n`);
    if (aiSolution.join('').trim() === norm.join('').trim()) {
      log('<<correct>>\n');
    } else {
      log('<<incorrect>>\n');
      console.log(output);
      await writeFile("error.txt", output)
    }

    return norm.join('').trim() === aiSolution.join('').trim()
  } else {
    log('<<not-found>>\n');
    return false;
  }
}

async function runFullChallenge(systemPrompt) {
  let correct = 0;
  const total = RUNS;
  
  for (let i = 0; i < total; i++) {
    const Test = `${i + 1} / ${RUNS}`;
    const Correct = `${correct} / ${i}`
    const Accuracy = `${(correct/i).toFixed(2)}`

    console.table({ Test, Correct, Accuracy })
    
    const isCorrect = await runChallenge(systemPrompt, 24);
    if (isCorrect) {
      correct++; 
    } else {
      throw new Error("The test failed.")
    }
  }

  LOG('')
  LOG("--- Final score ---");
  LOG(`${correct} / ${RUNS} (${(100 * correct / RUNS).toFixed(2)}%)`)
}

await runFullChallenge(prompt);
await fs.writeFile(`./users/${USER}/log.txt`, OUTPUT);
