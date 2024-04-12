import OpenAI from "openai";
import { join } from "path"
import { readFile } from "fs/promises";
import { resolve } from "path";
import { Anthropic } from "@anthropic-ai/sdk";

import { instances } from "./tokens.mjs"
import { normal, show } from "./utils.mjs";

const USER = process.argv[2] || "futuristfrog";
const RUNS = 50;

const loadUserFile = async (file) => {
  const path = resolve("users", USER, file);
  const contents = (await readFile(path, "utf-8")).trim()

  if (file.endsWith(".json")) {
    return JSON.parse(contents);
  }

  console.log({ contents })

  return contents;
}

const prompt = await loadUserFile("prompt.txt");
const model = await loadUserFile("model.txt");
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
    LOG(); // Add a newline at the end
    return message.content[0].text;
  } else {
    const message = await anthropic.messages.create({
      model,
      messages,
      max_tokens: max_tokens || 4096,
      temperature,
      ...(system && { system }),
    });
    const { content, ...metadata } = message;
    console.table(metadata);
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

async function runChallenge(system, model, level) {
  const term = instances[level][Math.floor(Math.random() * instances[level].length)];
  const params = { model, debug: true, ...config };
  const [norm, rwts] = normal(term);

  console.table(params);

  LOG(`Term: ${show(term)}`);
  LOG(`Norm: ${show(norm)}`);
  LOG(`Rwts: ${rwts}`);
  LOG(``);
  LOG(`AI-RESPONSE:`);

  const problem = `INPUT: ${show(term)}`;

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
    LOG(`\nAI-Solution: ${show(aiSolution)}\n`);
    if (aiSolution.join('').trim() === norm.join('').trim()) {
      LOG('<<correct>>\n');
    } else {
      LOG('<<incorrect>>\n');
    }

    return [norm.join('').trim(), aiSolution.join('').trim()]
  } else {
    LOG('<<not-found>>\n');
    return false;
  }
}

async function runFullChallenge(systemPrompt, model) {
  let correct = 0;
  const total = RUNS;
  
  for (let i = 0; i < total; i++) {
    const Test = `${i + 1} / ${RUNS}`;
    const Correct = `${correct} / ${i}`
    const Accuracy = `${(correct/i).toFixed(2)}`

    console.table({ Test, Correct, Accuracy })
    
    const [norm, solution] = await runChallenge(systemPrompt, model, 24);
    console.table({ norm, solution })

    if (solution === norm) {
      correct++; 
    } else {
      throw new Error("The test failed.")
    }
  }

  LOG('')
  LOG("--- Final score ---");
  LOG(`${correct} / ${RUNS} (${(100 * correct / RUNS).toFixed(2)}%)`)
}

LOG("USER: " + USER);
LOG("MODEL: " + model);
LOG("PROMPT:");
LOG(prompt);
LOG("");

await runFullChallenge(prompt, model);
await fs.writeFile(`./users/${USER}/log.txt`, OUTPUT);
