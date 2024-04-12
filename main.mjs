// This is the evaluator used on Taelin's A::B challenge. It is a pretty simple
// Node.js script (mostly written by Opus) that tests a prompt on random 12
// token instances (of varying difficulty) against a default interpreter. To use
// it, you must have your API key on:
// - ~./config/anthropic.token
// - ~/config/openai.token

// Config
// ======

const USER = process.argv[2] || "futuristfrog"; // <- replace by your user
const RUNS = 50; // total runs
const DIFF = run => Math.round(24 * (1 - run / RUNS));

// Script
// ======

import OpenAI from "openai";
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import process from "process";
import { Anthropic } from '@anthropic-ai/sdk';

let OUTPUT = "";
function PUT(txt) { if (txt) { OUTPUT += txt; process.stdout.write(txt); } }
function LOG(txt) { if (txt) { OUTPUT += txt+"\n"; console.log(txt); } }

// AI Utils
// --------

const { ANTHROPIC_API_KEY, OPENAI_API_KEY } = process.env

async function getAnthropicKey() {
  if (ANTHROPIC_API_KEY) {
    return ANTHROPIC_API_KEY
  }

  const keyPath = path.join(process.env.HOME, '.config', 'anthropic.token');
  return (await fs.readFile(keyPath, 'utf8')).trim();
}

async function getOpenAIKey() {
  if (OPENAI_API_KEY) {
    return OPENAI_API_KEY
  }

  const keyPath = path.join(process.env.HOME, '.config', 'openai.token');
  return (await fs.readFile(keyPath, 'utf8')).trim();
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

// A::B System
// -----------

const HA = "#A";
const HB = "#B";
const AH = "A#";
const BH = "B#";

const tokens = [HA,HB,AH,BH];

function reduce(xs) {
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

function normal(xs) {
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

function randomTerm() {
  const result = [];
  for (let i = 0; i < 12; i++) {
    result.push(tokens[Math.floor(Math.random() * tokens.length)]);
  }
  return result;
}

function show(xs) {
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

// Instances
// ---------

// 32 random instances for each difficulty level
// Algorithm: https://xkcd.com/221/
const instances = {
  0: [
    [HA,HB,HA,HA,HB,BH,BH,BH,BH,AH,BH,AH],
    [HB,HB,HB,HA,HB,HA,HA,HA,HB,HB,HA,HB],
    [HB,HB,HB,HA,HB,HB,HA,HB,HB,BH,BH,BH],
    [HB,HA,HB,HA,BH,AH,AH,AH,BH,AH,BH,AH],
    [HA,HA,HA,HA,HA,HA,HA,HA,HB,HA,HB,HB],
    [HA,HB,HA,HB,HB,BH,AH,AH,BH,BH,AH,AH],
    [HA,HB,HB,HB,HA,HB,HA,HA,HA,HB,HB,HA],
    [HB,HB,HA,HA,HA,HB,HA,BH,AH,BH,AH,AH],
    [HB,HA,HB,HB,HA,HB,HA,HA,HB,HB,HA,HA],
    [HB,HB,AH,AH,BH,BH,BH,BH,AH,BH,AH,BH],
    [HA,HA,HB,HB,HA,AH,AH,AH,BH,BH,BH,BH],
    [AH,AH,AH,AH,BH,BH,AH,AH,BH,AH,AH,BH],
    [HB,HB,HB,HB,HA,HA,HB,HB,HB,HA,HA,HA],
    [HB,HA,HA,HA,HB,HA,HA,HA,HA,HB,HA,AH],
    [HB,HB,HB,HA,HB,AH,BH,BH,BH,BH,AH,BH],
    [HB,HB,HB,HA,HA,HB,HB,HA,HA,HA,HA,BH],
    [HA,BH,BH,BH,AH,AH,BH,BH,AH,BH,BH,BH],
    [HB,HA,HB,HA,HB,HB,HB,HB,HA,HA,HB,HA],
    [HB,HB,HA,HA,AH,BH,BH,BH,BH,BH,AH,AH],
    [BH,BH,BH,AH,AH,AH,BH,AH,BH,AH,AH,BH],
    [HA,HA,AH,BH,AH,AH,BH,BH,BH,BH,BH,AH],
    [HB,BH,BH,AH,BH,BH,BH,AH,AH,AH,AH,BH],
    [HA,HB,HA,HB,HB,AH,AH,AH,BH,AH,AH,BH],
    [HB,BH,BH,BH,AH,BH,BH,AH,AH,BH,BH,AH],
    [HA,HA,HB,HB,HB,HB,HB,HA,HA,HA,HB,HA],
    [HA,HB,HA,HB,AH,BH,BH,AH,AH,AH,BH,AH],
    [HA,HA,HA,HA,HA,HB,HA,HB,HB,HB,HB,HB],
    [HA,BH,BH,AH,AH,BH,AH,AH,AH,AH,BH,AH],
    [HA,HA,HB,HB,HB,HB,HB,AH,AH,AH,AH,BH],
    [HA,HA,HB,HB,AH,BH,AH,BH,BH,BH,BH,AH],
    [HB,HA,HA,HB,HB,HB,HB,HA,BH,BH,AH,AH],
    [HA,HB,HB,HA,HA,HB,HB,HA,HA,HA,BH,BH],
  ],
  1: [
    [HB,HB,HB,HA,HB,AH,BH,AH,AH,HA,AH,BH],
    [BH,HB,HA,HB,HB,HA,HA,HB,HB,HA,HA,BH],
    [HB,HB,HA,AH,AH,AH,AH,HA,BH,BH,AH,AH],
    [HA,AH,HB,AH,AH,AH,BH,AH,AH,AH,AH,BH],
    [HA,HA,HA,HA,BH,HB,AH,AH,AH,AH,BH,AH],
    [HA,HA,HB,HB,HA,AH,BH,BH,AH,AH,HA,AH],
    [HA,HB,HA,HA,AH,HA,HB,HA,HA,AH,AH,BH],
    [BH,BH,AH,AH,BH,AH,BH,BH,HB,BH,AH,AH],
    [HA,HA,HB,HB,HB,HB,HB,BH,BH,BH,HB,AH],
    [HB,HB,HB,HA,BH,HB,AH,BH,AH,BH,BH,BH],
    [HA,HA,HB,HB,BH,HB,HB,BH,BH,BH,AH,AH],
    [HB,HA,BH,HB,AH,AH,BH,BH,AH,AH,AH,BH],
    [HA,HA,HA,HA,HB,BH,HB,HB,HA,AH,AH,AH],
    [HA,HA,HB,HA,AH,HA,HB,BH,BH,AH,AH,BH],
    [HB,AH,AH,AH,AH,BH,AH,AH,BH,HB,AH,BH],
    [HA,HB,AH,HA,HB,HA,HB,AH,AH,BH,AH,BH],
    [HB,HB,HB,AH,AH,HA,AH,BH,BH,AH,BH,BH],
    [HA,HB,HB,AH,HA,HB,BH,BH,AH,BH,BH,BH],
    [HB,HA,HA,AH,HB,BH,BH,AH,AH,BH,AH,AH],
    [HB,HB,HB,HA,HB,AH,HA,HA,HA,HA,HB,HB],
    [HA,HA,HA,HB,BH,HB,HB,HB,HA,HA,HB,HB],
    [HA,HB,AH,HA,HB,AH,AH,BH,AH,AH,BH,BH],
    [HB,HA,HB,HB,HA,HB,AH,BH,AH,BH,HB,AH],
    [HA,BH,HB,HA,AH,AH,BH,AH,AH,AH,BH,AH],
    [HA,HB,HA,HA,AH,BH,BH,BH,AH,HA,AH,BH],
    [BH,HB,HA,HB,HA,HA,HA,HB,HA,HA,BH,AH],
    [HB,HB,HB,BH,BH,BH,BH,BH,BH,AH,HA,AH],
    [HA,HA,HB,HB,BH,HB,HA,BH,BH,BH,BH,AH],
    [AH,HA,HA,HB,HA,HB,HA,HA,HB,AH,AH,BH],
    [HA,HA,HA,HA,BH,HB,HA,BH,BH,AH,BH,BH],
    [HB,HB,HA,HA,HA,HB,HA,HA,BH,AH,AH,HA],
    [HA,HB,HB,HB,AH,AH,AH,BH,HB,AH,BH,BH],
  ],
  2: [
    [HB,HA,AH,HB,HA,HA,BH,AH,AH,AH,AH,AH],
    [HB,AH,BH,HB,HA,HB,HB,BH,AH,AH,BH,BH],
    [HB,HA,HB,AH,HA,HA,HA,AH,HA,HB,HA,HA],
    [HA,BH,HB,HA,HA,HA,AH,AH,AH,HA,BH,AH],
    [HB,HA,HB,AH,HB,AH,HA,BH,BH,AH,BH,BH],
    [HA,HA,HB,HA,BH,AH,BH,HA,BH,AH,BH,AH],
    [BH,HA,HB,HB,HA,HB,BH,AH,BH,BH,BH,AH],
    [BH,HB,HB,HB,HA,HA,HA,BH,HA,AH,BH,AH],
    [HA,BH,HA,HB,HA,HA,HB,HA,HA,HA,HA,HA],
    [BH,HB,HA,HA,HB,AH,HA,HA,HB,AH,AH,BH],
    [HA,HA,AH,BH,BH,AH,HA,AH,AH,HA,AH,AH],
    [HA,AH,AH,HA,HA,HA,HA,HA,HA,HA,HA,AH],
    [HA,HA,HB,HB,AH,HA,HA,HB,HB,HB,AH,HA],
    [HA,HB,HA,HA,HB,AH,HB,HA,HA,HA,BH,BH],
    [HB,AH,HA,HB,HB,HA,HB,AH,BH,HB,AH,AH],
    [HB,HA,HA,HA,HB,AH,HA,HA,HA,AH,BH,HB],
    [HA,HA,AH,HA,HB,HB,HA,BH,HB,BH,BH,BH],
    [HA,AH,HA,BH,BH,AH,HA,AH,BH,AH,AH,BH],
    [HB,AH,HB,BH,AH,BH,BH,AH,HA,BH,BH,BH],
    [HA,AH,HA,HA,HA,HB,HB,AH,HA,AH,BH,AH],
    [HB,BH,HB,HA,HA,HB,HA,HA,HB,AH,AH,HA],
    [BH,HA,HB,HA,HB,HB,HB,AH,BH,AH,AH,BH],
    [HA,HB,HA,HA,AH,HA,HA,HA,BH,HB,HB,HA],
    [AH,BH,HB,AH,BH,HB,BH,BH,BH,BH,BH,AH],
    [HB,HB,HA,HB,AH,HB,HA,HB,HA,HA,HA,AH],
    [HB,HB,BH,BH,HA,AH,BH,BH,BH,BH,BH,BH],
    [HB,AH,HA,HA,HA,HB,HB,HA,HA,HA,AH,HA],
    [AH,AH,HA,HA,HB,HB,HB,HA,HA,AH,BH,BH],
    [HB,BH,HB,AH,BH,HB,AH,BH,BH,BH,AH,BH],
    [HB,BH,AH,BH,HB,BH,AH,BH,HB,AH,BH,BH],
    [BH,BH,AH,BH,AH,AH,AH,HA,BH,AH,BH,HB],
    [HB,HB,HA,HA,BH,AH,HB,BH,BH,BH,BH,BH]
  ],
  3: [
    [HB,AH,HA,BH,HB,AH,HB,BH,BH,AH,BH,AH],
    [HA,HA,BH,AH,AH,BH,HB,HA,BH,HB,BH,BH],
    [AH,HA,HA,HA,HA,HA,HA,AH,AH,AH,BH,HA],
    [HB,HA,BH,AH,BH,AH,HA,BH,HB,HB,AH,AH],
    [HB,HB,HA,BH,HB,AH,HA,AH,HB,BH,AH,AH],
    [AH,HA,HA,HA,HB,HA,HB,AH,AH,BH,AH,HB],
    [HA,HA,BH,HB,BH,HB,HA,HA,AH,HB,AH,AH],
    [HA,HB,AH,HA,AH,BH,HB,HB,BH,AH,AH,BH],
    [HA,AH,AH,BH,HB,AH,BH,AH,HA,BH,BH,HB],
    [HB,HB,HB,HA,HA,AH,BH,BH,HB,HB,AH,HA],
    [BH,HA,AH,HA,HB,HA,HA,AH,BH,AH,AH,BH],
    [HB,AH,HA,HA,HB,HB,AH,AH,HB,AH,BH,AH],
    [HA,HA,HB,AH,HA,HA,BH,HB,HA,AH,HA,AH],
    [BH,BH,HB,AH,AH,AH,AH,BH,AH,HB,BH,AH],
    [HB,HA,HA,HB,HB,HB,BH,HA,HB,BH,HA,AH],
    [HA,AH,HA,HA,HB,BH,HB,HB,HA,HA,BH,HB],
    [HB,HA,HB,HB,HB,AH,BH,HA,HB,HA,HA,BH],
    [HB,HB,HA,HA,HA,BH,HA,HB,HB,BH,HB,BH],
    [AH,HB,HA,HA,HA,HA,HB,AH,HB,AH,BH,AH],
    [AH,HA,HA,HA,BH,AH,BH,HB,AH,HA,AH,BH],
    [HA,AH,AH,HA,HA,HB,HB,AH,HA,HA,HB,HB],
    [AH,AH,HA,BH,BH,HB,BH,AH,AH,BH,HB,BH],
    [HB,HA,HB,AH,HA,BH,HA,HB,HB,HA,AH,AH],
    [HB,HA,HA,HB,HA,HA,AH,HB,HA,BH,HA,BH],
    [HB,HB,HA,HA,AH,BH,HA,HB,HA,HA,HB,BH],
    [HB,HA,HA,HB,BH,HA,HA,BH,AH,AH,HA,AH],
    [HB,HA,HA,HA,HB,HB,HA,BH,AH,HA,AH,HB],
    [HA,HA,HA,HB,HA,HB,AH,HA,HB,BH,HA,HB],
    [BH,HB,BH,AH,AH,BH,AH,AH,BH,HA,BH,AH],
    [HA,AH,BH,HB,HA,HA,HA,HA,BH,HA,AH,AH],
    [HA,AH,AH,HA,HA,HB,HA,HB,AH,BH,BH,HB],
    [AH,HA,HB,BH,HB,HB,HB,HB,BH,HB,HB,BH],
  ],
  4: [
    [BH,BH,HB,HB,HA,HB,BH,HB,HA,HA,BH,HA],
    [HA,HB,HB,AH,BH,AH,HB,HB,AH,BH,BH,BH],
    [BH,BH,AH,BH,BH,AH,BH,HA,AH,AH,BH,HA],
    [AH,AH,HA,AH,HA,BH,AH,HA,AH,BH,HB,AH],
    [HA,HA,BH,HB,HB,AH,BH,BH,HB,BH,HB,HB],
    [AH,HB,AH,AH,AH,HA,BH,HB,BH,HB,BH,AH],
    [HA,HB,AH,HB,HA,HB,BH,HB,BH,HB,AH,BH],
    [BH,HB,HB,HA,BH,AH,HB,HB,AH,AH,AH,BH],
    [BH,AH,HA,HB,HA,AH,AH,HA,AH,AH,HA,AH],
    [HB,HB,HA,HB,HA,HB,BH,HA,HA,AH,BH,HA],
    [HA,BH,BH,HB,AH,HB,BH,AH,AH,AH,HA,AH],
    [AH,HA,BH,AH,BH,HB,BH,AH,HB,AH,AH,BH],
    [HB,HB,HA,HB,AH,AH,BH,HA,HB,HA,HA,BH],
    [BH,BH,BH,AH,BH,BH,BH,AH,HA,AH,AH,HB],
    [HA,BH,HB,HA,BH,HB,AH,HB,HA,HA,HB,BH],
    [HB,HB,AH,HB,HB,HA,HB,AH,HA,HB,HA,BH],
    [HB,HB,HB,HB,BH,BH,AH,AH,HB,HA,BH,AH],
    [BH,BH,BH,AH,HB,HA,AH,BH,BH,HB,BH,AH],
    [BH,HB,AH,HB,HA,HA,HA,HB,HA,AH,HA,HA],
    [HA,BH,HB,HA,HA,HA,HA,BH,HA,HB,BH,HA],
    [HB,HB,HB,AH,BH,HB,AH,BH,HB,HA,HA,HB],
    [HA,BH,AH,HA,HB,BH,AH,HA,HB,HB,HB,HB],
    [HA,BH,HB,HA,AH,AH,HA,HA,BH,HB,BH,BH],
    [HB,HB,HA,AH,HA,HB,AH,HA,BH,AH,HA,HB],
    [AH,HA,HB,AH,BH,BH,BH,HB,HB,HB,BH,BH],
    [HB,HB,HB,BH,BH,HB,HA,BH,HB,AH,HA,BH],
    [HA,BH,HA,HA,HB,AH,HA,BH,AH,AH,BH,AH],
    [HB,HB,HA,AH,HA,BH,AH,AH,HA,AH,BH,HA],
    [BH,HA,HB,AH,HA,HB,HB,BH,HB,HA,HA,AH],
    [HA,BH,HB,HA,BH,BH,HA,BH,BH,AH,HA,AH],
    [HB,BH,HB,BH,HA,HA,HA,BH,BH,BH,BH,AH],
    [AH,AH,AH,BH,HB,BH,AH,HA,HB,BH,HB,AH],
  ],
  5: [
    [AH,HB,AH,HA,HA,BH,HB,HB,AH,HA,HB,AH],
    [AH,BH,HA,HB,HA,HA,AH,BH,BH,HB,AH,HA],
    [AH,HA,HA,BH,HB,AH,HB,HB,BH,AH,HA,AH],
    [AH,BH,HA,AH,HB,BH,BH,BH,AH,HA,AH,AH],
    [AH,AH,BH,BH,AH,HA,AH,AH,HB,AH,AH,HA],
    [BH,HB,BH,HA,HA,HA,HB,HB,HB,HA,BH,AH],
    [HA,AH,HB,BH,HB,AH,BH,HB,BH,HB,HA,AH],
    [BH,BH,AH,HB,HA,HA,HB,AH,AH,AH,BH,BH],
    [HB,HA,BH,HA,BH,AH,AH,AH,HA,HA,HA,HB],
    [BH,AH,HA,HA,HB,AH,HB,HA,HA,HA,AH,BH],
    [AH,BH,AH,BH,HB,HA,HB,HB,AH,AH,AH,HA],
    [BH,HB,HB,AH,HA,AH,HB,HA,BH,HB,HA,HA],
    [HA,AH,AH,BH,HB,HA,HB,HA,AH,HA,BH,AH],
    [HB,HB,HA,AH,HB,HA,AH,HA,AH,HB,BH,HB],
    [HB,BH,HA,HA,HA,AH,HA,HB,BH,AH,BH,BH],
    [AH,HA,AH,HA,HA,BH,HA,HB,HB,BH,HB,HA],
    [HA,HA,HB,BH,AH,BH,AH,HA,HA,HB,HB,BH],
    [HB,BH,HB,AH,AH,HA,AH,BH,BH,HA,BH,AH],
    [HA,BH,HA,HA,HB,BH,HB,HA,BH,BH,BH,HB],
    [BH,BH,HB,HB,AH,HB,AH,HA,AH,BH,HB,BH],
    [BH,AH,HB,HA,AH,HA,HB,HA,AH,HB,AH,BH],
    [HA,HB,HB,HB,HB,BH,HA,HA,AH,HA,HA,HA],
    [BH,HA,HB,AH,HA,HA,HA,BH,HA,HB,HB,BH],
    [HB,HA,AH,HA,BH,HA,HB,AH,BH,HB,HA,HB],
    [AH,AH,HB,HA,AH,BH,BH,HB,AH,HA,BH,AH],
    [AH,AH,BH,HA,AH,HA,AH,AH,HA,AH,HA,AH],
    [HB,HB,HB,BH,AH,HB,BH,HB,AH,HB,BH,AH],
    [HB,HA,BH,HB,HA,BH,HB,HA,AH,HB,HB,HB],
    [HB,HA,AH,HB,HB,BH,AH,HA,BH,AH,HB,BH],
    [HA,BH,HB,HB,HA,AH,HB,HA,HB,AH,AH,HB],
    [HA,HA,HA,HA,AH,AH,HA,HB,HA,AH,HB,HA],
    [HA,HA,HB,AH,HA,BH,BH,HA,BH,HB,HB,BH],
  ],
  6: [
    [BH,HA,HA,HA,HA,HB,HB,HA,BH,HB,BH,AH],
    [HB,AH,HB,HB,BH,HB,BH,HA,HB,HB,HA,HA],
    [HB,HB,AH,BH,HB,BH,HA,BH,AH,HB,AH,HA],
    [BH,HA,BH,HB,HB,AH,AH,AH,HA,HB,BH,AH],
    [HB,BH,BH,HA,HB,BH,BH,HB,BH,HB,HB,AH],
    [HA,AH,AH,HA,HB,HA,AH,HB,HB,AH,HA,AH],
    [HA,HA,AH,HB,HB,HB,HA,AH,HB,BH,AH,HA],
    [AH,BH,BH,HB,HB,HA,AH,HB,AH,HB,BH,BH],
    [HA,BH,AH,HB,AH,HB,HA,HA,HA,HA,HB,AH],
    [BH,AH,BH,HA,BH,BH,AH,AH,BH,HB,HB,BH],
    [BH,AH,AH,AH,HA,HA,BH,HA,AH,HB,BH,AH],
    [AH,AH,HA,HB,AH,HA,HA,HB,HA,BH,HA,HA],
    [BH,BH,HB,HB,AH,HA,HB,AH,AH,AH,HB,AH],
    [BH,BH,HA,HA,HB,HB,HB,HB,HB,HA,HA,HA],
    [BH,HB,BH,BH,HA,BH,HB,AH,BH,AH,HB,AH],
    [AH,HB,BH,BH,HB,HA,HB,AH,HA,HA,HB,HA],
    [BH,AH,AH,HA,HB,HB,HA,AH,HA,HA,HB,HA],
    [HA,HA,AH,HB,HA,BH,HA,HA,HB,AH,HA,AH],
    [AH,HA,BH,HB,BH,AH,AH,BH,BH,HA,AH,HA],
    [BH,HB,HA,BH,AH,HA,HB,BH,AH,HB,HA,BH],
    [HA,HB,BH,AH,HB,HB,HB,HB,BH,AH,HA,BH],
    [BH,HA,BH,AH,HA,HB,AH,HA,BH,HA,BH,AH],
    [HB,AH,HA,AH,BH,HB,BH,HA,HA,AH,HA,BH],
    [AH,HB,HA,BH,BH,BH,BH,HA,BH,AH,BH,AH],
    [AH,BH,HB,BH,HB,AH,HB,AH,HA,AH,HA,AH],
    [BH,HB,AH,BH,BH,HB,HA,AH,HA,HA,AH,AH],
    [BH,BH,HB,HB,AH,HA,AH,AH,HB,BH,HB,BH],
    [AH,AH,HA,AH,HA,HA,AH,HA,AH,HB,AH,HA],
    [HB,AH,AH,HB,BH,AH,HB,BH,HB,HA,AH,BH],
    [BH,HB,AH,HA,AH,AH,BH,HA,HB,AH,BH,HB],
    [HA,AH,BH,AH,HB,HB,HB,AH,AH,AH,BH,AH],
    [HA,HB,HA,AH,HA,AH,AH,HB,BH,BH,HB,HA],
  ],
  7: [
    [AH,BH,HA,BH,HB,HA,BH,BH,BH,AH,AH,HB],
    [HB,HB,HA,BH,HA,BH,BH,AH,HA,BH,BH,HA],
    [BH,AH,HA,HB,HB,BH,HA,AH,AH,AH,HB,AH],
    [BH,AH,BH,HA,HA,AH,AH,HA,AH,BH,HB,HA],
    [BH,BH,BH,AH,AH,AH,AH,HB,BH,HA,BH,AH],
    [AH,BH,BH,HA,HA,HB,HB,HA,HB,HB,HA,AH],
    [AH,HB,HB,HA,AH,AH,HB,BH,AH,HB,BH,BH],
    [HB,HB,HB,AH,HB,HB,AH,AH,HB,AH,BH,HA],
    [AH,AH,AH,HB,BH,HB,BH,HA,AH,HA,BH,AH],
    [HB,HB,HA,BH,AH,HA,AH,HB,BH,BH,HA,HB],
    [HA,AH,HA,AH,BH,HB,HB,BH,HA,AH,HB,BH],
    [HA,HA,AH,AH,BH,HB,BH,HA,BH,HA,HB,BH],
    [BH,AH,BH,HB,AH,BH,BH,HB,BH,BH,BH,HA],
    [HB,BH,BH,BH,BH,HB,HB,AH,HB,AH,HB,BH],
    [BH,HA,HA,HB,BH,AH,BH,BH,HA,HB,BH,AH],
    [AH,BH,HB,HA,AH,BH,HB,AH,HA,BH,HA,HB],
    [AH,HA,AH,HB,BH,HA,HA,HB,HB,HA,BH,HA],
    [BH,HB,HA,AH,BH,HA,AH,AH,HB,BH,AH,HA],
    [HA,BH,HB,HB,HB,HB,BH,BH,HA,AH,HB,HB],
    [HB,HA,BH,HB,BH,AH,HB,HA,BH,HA,HA,HB],
    [HB,AH,HA,BH,BH,HB,AH,BH,HB,AH,AH,HB],
    [BH,AH,HA,BH,HA,HB,BH,HB,AH,BH,HA,BH],
    [HB,HA,AH,HB,AH,HA,HB,HB,BH,HA,HA,AH],
    [BH,HB,HA,HA,BH,BH,AH,HB,HB,HA,AH,HB],
    [HA,AH,HB,BH,HB,AH,HB,BH,BH,AH,AH,HB],
    [HA,AH,HB,HA,BH,HA,BH,AH,HA,HA,HB,BH],
    [BH,HA,BH,HB,HA,BH,HB,BH,HA,HB,BH,BH],
    [AH,HB,HA,HB,BH,AH,HB,BH,BH,HB,AH,HB],
    [AH,HB,HB,HA,HB,HB,AH,HA,AH,BH,BH,HA],
    [AH,AH,HA,HA,AH,HA,AH,BH,HA,HB,BH,HB],
    [HB,HB,HB,AH,BH,HA,HA,HB,AH,BH,BH,HA],
    [HA,BH,AH,HB,AH,HB,HA,HA,HA,AH,HB,BH],
  ],
  8: [
    [HA,BH,HB,AH,AH,HB,HA,HB,BH,AH,AH,HB],
    [HA,HB,HA,HA,BH,AH,BH,HA,HA,BH,BH,HA],
    [BH,AH,HA,AH,HA,AH,BH,HA,AH,HB,HB,BH],
    [BH,HB,AH,HB,AH,AH,AH,HB,AH,BH,HA,BH],
    [AH,AH,AH,HA,HA,HB,BH,AH,HA,HA,BH,HA],
    [BH,AH,HA,BH,HA,AH,BH,HA,AH,BH,BH,HA],
    [BH,HA,HA,BH,AH,BH,HB,HB,AH,HB,AH,AH],
    [HA,HA,BH,AH,BH,HB,AH,AH,HB,HA,HA,HA],
    [AH,HA,AH,AH,AH,AH,HA,HB,BH,HA,HB,AH],
    [BH,HA,HA,BH,HB,HA,HA,HA,HB,HA,BH,HA],
    [BH,BH,HA,HA,HB,HA,HA,HB,HA,HB,HA,AH],
    [AH,BH,BH,HA,HA,BH,AH,BH,HA,HB,AH,BH],
    [BH,HB,HB,HA,AH,AH,HB,BH,HB,HB,HA,HB],
    [HA,AH,BH,HA,AH,HB,BH,HA,HB,BH,AH,HA],
    [AH,BH,HA,AH,HA,AH,HB,AH,HA,BH,AH,HB],
    [BH,HB,BH,HA,HB,BH,BH,BH,HA,HB,AH,HA],
    [HA,BH,HA,HA,HA,HA,HB,AH,BH,HA,HB,BH],
    [BH,HB,AH,HB,HB,HB,HB,HB,AH,BH,HB,HA],
    [BH,HB,BH,BH,HA,HB,AH,HB,HA,BH,HA,BH],
    [AH,BH,BH,BH,AH,BH,AH,BH,BH,HA,HA,HB],
    [HB,AH,AH,HB,AH,AH,HB,AH,HA,BH,BH,HB],
    [HA,AH,AH,AH,HA,AH,AH,AH,HB,BH,HB,HA],
    [HB,AH,BH,AH,HB,AH,AH,AH,AH,HB,BH,AH],
    [BH,BH,BH,HA,HA,HB,AH,AH,AH,AH,HA,AH],
    [BH,HA,HA,AH,HB,AH,BH,AH,BH,HB,HB,HA],
    [BH,HA,BH,AH,AH,AH,BH,BH,AH,HA,HA,HA],
    [HA,AH,BH,AH,AH,HA,HB,BH,HA,HA,AH,HA],
    [AH,HB,HB,HA,BH,HA,HB,BH,HA,BH,HB,HA],
    [HA,AH,HB,BH,BH,BH,HA,AH,BH,HB,HA,HB],
    [HB,HA,AH,BH,HA,AH,HB,HB,HA,AH,BH,HA],
    [BH,BH,AH,HB,HB,HB,HB,AH,HB,AH,BH,AH],
    [BH,BH,HB,HA,AH,HB,BH,HB,HA,BH,AH,HB],
  ],
  9: [
    [AH,BH,HA,BH,AH,HB,HB,BH,HA,HA,AH,AH],
    [BH,BH,AH,AH,HB,HB,HA,HB,HA,AH,AH,AH],
    [BH,AH,AH,HA,AH,HB,AH,AH,HA,BH,HB,HB],
    [HB,BH,HA,BH,HA,HB,AH,HB,HB,HB,BH,HB],
    [HA,BH,BH,AH,BH,BH,BH,HB,HA,HB,HA,HB],
    [AH,HB,HA,HB,AH,HB,HB,BH,HA,AH,HB,HA],
    [HA,AH,HA,BH,AH,HA,BH,BH,HA,HA,BH,HB],
    [BH,BH,HB,HA,BH,BH,HA,AH,HA,HB,HB,HB],
    [AH,AH,HB,AH,BH,AH,AH,HA,HB,HB,BH,BH],
    [BH,HA,BH,AH,HB,BH,AH,HB,HB,BH,HB,AH],
    [BH,HB,BH,AH,AH,AH,HB,HB,HA,BH,BH,BH],
    [AH,HB,AH,BH,HA,HB,BH,AH,HA,HA,AH,HB],
    [HA,AH,BH,HA,HA,BH,HA,HA,BH,HB,BH,HB],
    [AH,BH,BH,BH,HB,AH,HB,BH,HA,BH,HB,HA],
    [BH,BH,HA,AH,HB,HA,HB,AH,HB,BH,HA,BH],
    [BH,BH,HA,BH,BH,HB,HA,AH,HB,AH,HA,AH],
    [HA,AH,HB,AH,HB,BH,HA,BH,HB,HA,HB,HA],
    [HA,HA,HA,HB,AH,AH,HB,HB,HB,HA,BH,HA],
    [AH,AH,HB,HB,HA,BH,HB,HB,HA,AH,HA,BH],
    [BH,HB,AH,BH,HA,BH,HA,HA,HB,BH,BH,HB],
    [BH,HB,AH,HA,HA,BH,AH,AH,HB,AH,HB,HA],
    [BH,BH,AH,AH,AH,BH,AH,HB,AH,BH,HB,HB],
    [HB,AH,HB,BH,HA,BH,AH,HB,AH,BH,HB,HB],
    [BH,HA,HA,BH,BH,HB,HA,AH,HA,HB,HA,HA],
    [BH,HA,HB,AH,HB,HA,BH,BH,HA,BH,HA,AH],
    [HB,AH,AH,HA,HA,BH,AH,BH,AH,AH,HB,HB],
    [HA,BH,BH,BH,HA,BH,HB,BH,HB,HB,BH,HA],
    [BH,BH,BH,BH,AH,HB,AH,HA,HB,HB,BH,HA],
    [BH,HA,HA,HB,AH,AH,AH,AH,BH,HB,HB,HA],
    [HA,BH,BH,AH,HB,HB,BH,AH,HB,AH,HB,BH],
    [HA,BH,HA,BH,HA,HB,HB,AH,BH,HA,AH,HB],
    [HA,AH,BH,HB,AH,HB,HB,HB,BH,AH,HB,AH],
  ],
  10: [
    [AH,HB,HB,BH,BH,BH,HA,HB,AH,HA,HB,HA],
    [HA,HA,AH,HB,BH,AH,HB,AH,HB,AH,HB,BH],
    [HA,AH,HB,AH,HB,HB,BH,HB,HB,HA,HB,AH],
    [BH,HA,HA,AH,AH,BH,HB,AH,HB,HB,AH,BH],
    [BH,BH,AH,AH,BH,HA,AH,HB,HB,HB,BH,AH],
    [AH,HB,BH,HA,HA,BH,HA,HB,BH,HB,HA,HB],
    [AH,AH,BH,AH,AH,AH,HB,HB,HA,AH,BH,AH],
    [HA,HA,HB,HB,AH,AH,AH,AH,HB,AH,AH,HB],
    [BH,BH,HA,HA,HA,AH,HA,AH,HB,AH,BH,HB],
    [AH,BH,HB,AH,AH,BH,HB,AH,HB,HA,HA,HB],
    [HA,HA,BH,BH,HA,AH,BH,BH,HA,HA,HB,BH],
    [AH,AH,AH,HB,BH,AH,AH,HA,HA,HB,AH,HB],
    [HB,BH,AH,BH,BH,BH,AH,HA,HA,HA,HB,BH],
    [BH,AH,HB,HB,HB,AH,HB,HA,BH,AH,HB,HA],
    [HB,BH,HA,HA,AH,BH,HA,BH,HB,HA,BH,HA],
    [HB,HA,HB,BH,AH,AH,HA,BH,BH,HA,HA,HA],
    [BH,AH,BH,AH,HA,HA,AH,HB,HB,HB,BH,HA],
    [AH,BH,BH,HA,HB,HA,HA,HA,AH,BH,BH,HA],
    [BH,BH,HA,HB,BH,AH,HB,AH,HB,BH,HB,HA],
    [BH,HA,AH,BH,HA,BH,AH,AH,HB,HB,HA,AH],
    [HA,BH,HA,BH,BH,HA,HB,BH,BH,HB,HA,HB],
    [BH,AH,AH,AH,AH,HA,HB,HA,AH,AH,HB,AH],
    [AH,BH,AH,AH,HB,AH,HB,BH,HA,BH,AH,HA],
    [HA,AH,AH,AH,HB,BH,AH,HB,HB,BH,HB,AH],
    [BH,BH,HA,AH,HA,BH,HA,HB,HB,HA,HA,BH],
    [HB,HA,BH,BH,AH,HA,HB,BH,HA,BH,HA,HA],
    [HA,BH,AH,AH,HA,AH,HB,HB,HA,HB,AH,HB],
    [BH,AH,AH,HB,BH,HB,AH,AH,AH,HB,HA,BH],
    [BH,AH,AH,AH,BH,HA,AH,HB,BH,HB,HB,HA],
    [HA,BH,AH,AH,AH,HB,BH,BH,HB,HB,AH,HB],
    [BH,AH,AH,HB,AH,BH,HA,HA,HA,HB,HA,AH],
    [AH,AH,HB,BH,AH,BH,AH,HB,BH,AH,HB,HB],
  ],
  11: [
    [HA,HA,BH,HA,BH,HA,HA,BH,AH,HB,HB,HB],
    [BH,HA,BH,AH,HB,BH,AH,HB,HB,HB,AH,HA],
    [AH,HA,HB,HB,BH,BH,AH,AH,HB,HB,HB,HB],
    [BH,HA,HA,AH,AH,AH,HA,HB,HB,HA,BH,HA],
    [AH,HB,BH,HB,HB,AH,HB,HB,AH,HA,AH,HB],
    [HA,BH,BH,BH,AH,HA,AH,HB,BH,HA,HA,HA],
    [AH,BH,HA,HA,BH,AH,BH,AH,HB,HB,HA,HB],
    [BH,BH,BH,HA,HB,AH,AH,HB,HB,AH,BH,HB],
    [HA,AH,AH,AH,AH,HB,BH,HB,AH,AH,HB,AH],
    [AH,HA,BH,HA,BH,HA,HA,HA,HB,HA,HB,HA],
    [AH,AH,AH,BH,HB,HB,AH,BH,BH,HA,HA,HB],
    [HA,AH,AH,AH,HB,BH,HA,BH,BH,BH,HA,HB],
    [AH,HB,AH,HB,HB,HB,HA,HA,AH,BH,HA,BH],
    [HB,BH,HB,AH,AH,HB,HB,HB,BH,HB,AH,HB],
    [HA,AH,HB,AH,BH,BH,BH,HA,HB,HA,AH,HB],
    [AH,HB,AH,HA,AH,HB,HB,BH,HA,HB,HB,HB],
    [AH,HB,AH,BH,HB,HB,HB,HB,HB,AH,HA,AH],
    [AH,AH,HA,AH,HB,AH,HB,BH,BH,BH,HA,HB],
    [AH,BH,BH,HA,HA,AH,AH,HB,HA,HA,HB,BH],
    [AH,BH,HB,BH,AH,HB,AH,HB,AH,BH,HB,HB],
    [AH,HA,AH,AH,HB,BH,HA,HA,BH,HA,AH,HB],
    [BH,AH,AH,AH,HB,HA,AH,AH,HA,AH,AH,HB],
    [BH,BH,AH,BH,HA,HA,AH,BH,HA,HB,HA,AH],
    [HB,BH,AH,AH,AH,AH,AH,HB,BH,HA,BH,HA],
    [BH,HA,BH,HA,BH,HB,HA,AH,HB,HA,BH,HA],
    [AH,AH,BH,AH,AH,HB,BH,HB,AH,AH,AH,HB],
    [BH,HA,HA,AH,HA,BH,AH,BH,BH,HA,BH,HA],
    [HA,AH,HA,HB,HB,BH,BH,HA,HA,BH,HA,HA],
    [BH,BH,BH,BH,HB,HA,HA,BH,HA,AH,AH,BH],
    [HB,BH,BH,HA,HA,BH,AH,AH,AH,HA,HB,HB],
    [AH,BH,HA,HA,HB,AH,AH,HB,HB,HA,HB,HA],
    [AH,BH,BH,HA,AH,HA,HB,AH,BH,HA,HA,HA],
  ],
  12: [
    [BH,BH,HA,HA,BH,AH,HA,HA,BH,HA,BH,AH],
    [HB,BH,BH,HA,BH,BH,HA,HA,AH,HA,HB,BH],
    [HA,BH,BH,HB,HA,BH,HA,AH,AH,AH,HB,HB],
    [AH,AH,HB,HB,HB,HB,HA,BH,HA,HB,AH,AH],
    [HB,AH,HA,BH,AH,AH,AH,HB,HB,HB,AH,HA],
    [HB,BH,BH,HA,BH,HB,BH,HA,BH,HA,AH,HB],
    [AH,HB,AH,HB,AH,HB,AH,HB,HA,HA,BH,BH],
    [AH,AH,HB,HB,HB,HA,BH,HB,HB,AH,AH,HB],
    [HA,HB,HB,BH,BH,AH,AH,AH,AH,AH,HB,HB],
    [BH,HA,HA,BH,AH,HB,HB,BH,AH,HB,HB,HB],
    [AH,BH,AH,HA,AH,HB,BH,AH,HB,HB,AH,HB],
    [AH,BH,AH,HB,HB,HB,HB,BH,HA,HB,HB,AH],
    [AH,BH,BH,HA,BH,AH,HA,HA,HA,AH,HB,BH],
    [AH,BH,BH,HA,HA,HA,AH,AH,HB,BH,AH,HB],
    [HA,AH,HB,HB,HB,AH,AH,AH,HB,HB,BH,HB],
    [BH,HA,HA,HA,HB,HA,BH,BH,HA,BH,HA,HA],
    [AH,AH,AH,HB,HB,HA,HA,AH,AH,HB,BH,HB],
    [AH,BH,AH,HB,HB,HA,BH,BH,HA,BH,BH,HA],
    [BH,HA,BH,AH,BH,AH,HB,HB,HB,AH,HB,BH],
    [AH,BH,BH,AH,BH,BH,HA,HA,BH,AH,HB,HB],
    [AH,AH,AH,BH,AH,HB,HB,HB,HA,BH,BH,HB],
    [AH,AH,HB,BH,BH,BH,HB,HA,HA,BH,HA,BH],
    [AH,AH,HB,BH,HA,HA,BH,HA,HA,HB,BH,HB],
    [AH,HB,AH,HB,HB,HB,HA,BH,BH,HA,AH,HA],
    [AH,AH,HB,HB,AH,HB,HB,BH,HB,HA,BH,AH],
    [HB,AH,AH,HB,AH,AH,HA,AH,HB,HB,AH,HA],
    [BH,HA,BH,AH,AH,HB,BH,HA,BH,HA,HB,HA],
    [AH,AH,AH,HB,HB,HB,AH,BH,BH,HB,HA,BH],
    [AH,HB,HA,HB,BH,AH,AH,AH,HB,HB,HB,AH],
    [BH,BH,AH,BH,HA,HB,AH,BH,HA,HA,BH,HA],
    [AH,HA,AH,AH,AH,HB,HB,AH,HB,AH,BH,HB],
    [BH,BH,HA,HA,HA,HB,AH,BH,HA,HB,HA,HA],
  ],
  13: [
    [BH,HA,BH,HB,BH,HA,BH,HA,HA,HB,HB,HA],
    [AH,BH,HA,BH,AH,HB,BH,AH,HB,AH,HB,HB],
    [BH,AH,AH,HB,AH,HA,HB,HB,HA,AH,HB,HB],
    [BH,AH,AH,HA,AH,HB,HB,HB,BH,HB,HB,HB],
    [BH,BH,BH,HB,BH,BH,HA,BH,HB,HB,HA,HA],
    [HB,BH,BH,AH,AH,HB,BH,HB,AH,AH,HB,HB],
    [BH,HA,AH,AH,HB,HB,AH,BH,HA,AH,HB,HB],
    [BH,HB,HB,AH,BH,HA,BH,HA,HA,BH,HA,HA],
    [HA,AH,BH,AH,AH,AH,AH,AH,HA,AH,HB,HB],
    [HA,AH,BH,BH,HA,BH,HA,BH,HB,HA,HA,BH],
    [BH,HA,HA,HB,AH,AH,HB,AH,AH,HB,HA,HB],
    [AH,HB,AH,HB,AH,HB,HB,HA,HA,HB,BH,HB],
    [HB,BH,AH,BH,AH,BH,BH,HA,BH,HA,HB,HA],
    [BH,BH,AH,HB,AH,HB,HB,AH,HB,BH,HA,HB],
    [BH,BH,BH,HA,HA,HA,HA,HB,BH,BH,BH,BH],
    [AH,AH,HB,HB,HB,AH,HB,HB,AH,BH,HB,BH],
    [HA,HB,BH,BH,HA,HA,AH,HA,BH,BH,HA,HA],
    [HB,AH,AH,BH,HB,BH,HA,BH,BH,HA,HA,HA],
    [BH,AH,BH,HA,AH,BH,HA,HA,HA,HA,BH,BH],
    [BH,BH,HA,BH,BH,HA,BH,BH,HA,BH,BH,HB],
    [AH,HB,AH,AH,HB,HB,HB,HA,HA,HA,AH,BH],
    [BH,AH,AH,AH,AH,HB,AH,AH,AH,HB,BH,HB],
    [AH,AH,HB,AH,AH,HB,HA,HB,BH,HB,BH,HA],
    [AH,HB,AH,AH,HB,BH,HA,BH,BH,HB,HA,HA],
    [AH,HB,HB,AH,AH,HB,BH,HA,BH,HA,HA,BH],
    [HB,AH,HB,AH,AH,HB,HB,AH,HA,AH,AH,HB],
    [HA,AH,HB,AH,AH,AH,AH,AH,HA,HB,HB,HA],
    [HB,BH,AH,AH,BH,HB,AH,HB,HB,AH,HB,HA],
    [HA,AH,AH,AH,AH,HB,BH,BH,HA,HA,HB,HA],
    [BH,BH,BH,BH,BH,AH,HA,HA,AH,HB,HA,HA],
    [BH,HA,HA,BH,BH,HA,AH,HB,HA,HA,HA,HB],
    [AH,AH,AH,HB,HA,HA,AH,AH,HB,HB,BH,HA],
  ],
  14: [
    [AH,BH,BH,BH,HA,HA,BH,BH,AH,HB,HA,HA],
    [BH,BH,HA,BH,AH,HA,BH,HA,HA,HB,AH,HB],
    [BH,BH,BH,HB,HA,BH,BH,BH,HA,HB,HA,HB],
    [BH,AH,BH,HA,HA,HA,BH,HA,BH,BH,HA,BH],
    [AH,AH,AH,AH,AH,HA,BH,AH,HB,HB,AH,HB],
    [BH,BH,HA,HA,HA,HA,AH,BH,HB,HB,HB,HB],
    [BH,HA,AH,HB,AH,HB,AH,HB,AH,AH,AH,HB],
    [BH,AH,HB,HB,AH,AH,HB,AH,HA,HB,AH,HB],
    [AH,AH,HB,BH,HB,HB,AH,HB,HB,HB,BH,BH],
    [HB,AH,AH,AH,HB,HB,AH,HB,BH,HA,HA,BH],
    [BH,BH,HA,BH,AH,HA,HA,HA,HB,HA,HA,AH],
    [AH,HB,HA,AH,AH,AH,HB,AH,HB,HB,AH,HA],
    [AH,AH,HB,AH,HB,AH,HB,HB,AH,AH,AH,HA],
    [AH,HA,AH,HA,BH,BH,HA,HA,BH,BH,HA,HA],
    [HA,BH,AH,HB,AH,HB,AH,HB,HB,HB,AH,HA],
    [BH,AH,BH,AH,AH,HB,AH,AH,HA,HB,HB,HA],
    [HA,HB,HA,AH,AH,HB,AH,AH,HB,HB,HB,BH],
    [BH,BH,BH,HA,HA,HA,BH,HA,BH,BH,AH,HA],
    [HA,BH,HA,AH,AH,HB,HB,BH,BH,HA,HA,HA],
    [BH,BH,HA,BH,AH,HA,HA,HA,HB,HA,HB,HA],
    [AH,HB,HA,BH,BH,BH,HA,HA,BH,HA,AH,HB],
    [BH,AH,BH,HA,HA,AH,AH,HB,HB,AH,AH,HB],
    [AH,HA,BH,AH,HA,AH,BH,BH,BH,HA,HA,HA],
    [BH,BH,HB,BH,BH,HA,HA,HA,BH,AH,HB,HB],
    [BH,AH,BH,AH,HB,AH,HB,HB,HA,HB,HA,HB],
    [BH,HA,AH,AH,HB,HB,HB,AH,AH,HB,HA,HA],
    [AH,HB,AH,AH,HB,HA,AH,AH,HB,HA,AH,HB],
    [AH,BH,BH,BH,HA,HA,HB,HA,BH,BH,HA,BH],
    [HA,HA,AH,HB,AH,AH,AH,HB,HB,HB,HA,AH],
    [BH,BH,AH,HA,HA,BH,AH,BH,HA,HA,HA,HB],
    [BH,HA,BH,BH,HA,HB,HA,BH,HA,BH,HA,BH],
    [AH,AH,AH,AH,HB,BH,HA,HA,AH,HB,HB,HA],
  ],
  15: [
    [BH,AH,BH,BH,BH,AH,HA,HA,HA,HA,AH,HB],
    [AH,HA,AH,AH,HB,HB,HB,HB,HB,HB,HB,AH],
    [HA,HA,AH,BH,AH,HB,AH,HB,HB,HB,HB,HA],
    [BH,BH,HA,HA,HB,BH,BH,HA,HA,AH,HA,HA],
    [BH,BH,BH,HA,BH,HA,HA,HB,AH,HB,AH,HA],
    [HB,AH,AH,AH,AH,AH,AH,HB,AH,HB,HA,HA],
    [AH,BH,AH,BH,BH,BH,HB,BH,HA,HA,HA,HB],
    [BH,AH,AH,AH,HB,HB,HB,AH,HA,HA,AH,HB],
    [BH,HA,BH,HA,HA,BH,AH,AH,HB,HB,HB,HA],
    [BH,BH,AH,BH,AH,BH,HA,BH,HA,HB,HA,HA],
    [BH,BH,BH,HA,BH,BH,HA,HB,BH,HA,HB,BH],
    [BH,BH,BH,HA,AH,HB,BH,HA,HA,BH,BH,HA],
    [HA,HA,BH,BH,BH,BH,HA,HA,BH,HA,HB,HB],
    [AH,AH,HB,HB,HB,HA,HB,BH,BH,BH,HA,HA],
    [HB,BH,BH,AH,HA,HA,HA,BH,HA,HA,BH,HA],
    [BH,BH,HB,AH,BH,HA,HA,BH,HA,HA,HA,HB],
    [HB,AH,AH,AH,AH,AH,HB,BH,HB,HA,HB,HB],
    [AH,HB,AH,AH,HB,AH,HB,HA,AH,HB,HA,HA],
    [AH,AH,HB,HB,HA,AH,AH,HB,AH,HA,HB,HB],
    [BH,BH,BH,AH,BH,HA,HA,HA,HA,HB,AH,AH],
    [AH,AH,HB,BH,BH,HB,AH,AH,HB,HB,HB,HA],
    [BH,AH,AH,AH,HA,AH,AH,AH,AH,HB,HB,HA],
    [HA,BH,AH,BH,BH,BH,BH,HA,HA,HA,BH,AH],
    [HB,BH,BH,AH,BH,HA,HA,AH,HA,HA,HA,HA],
    [HA,BH,HA,BH,BH,HB,BH,HA,HA,HA,HA,HB],
    [BH,BH,BH,HA,BH,AH,HB,AH,HB,HB,AH,HB],
    [AH,BH,BH,HB,HA,BH,HA,HA,BH,BH,HA,HA],
    [AH,AH,HB,HB,AH,BH,AH,HB,HB,HB,BH,HB],
    [HB,HA,AH,AH,HB,AH,AH,HB,HB,AH,HB,AH],
    [HA,BH,HA,BH,HA,BH,BH,BH,BH,HA,HA,BH],
    [BH,HB,AH,AH,HB,AH,AH,HB,HB,HA,HA,HB],
    [BH,HA,BH,BH,HA,HA,HB,HB,BH,BH,HA,HA],
  ],
  16: [
    [AH,BH,HA,HA,AH,BH,BH,BH,HA,HA,HA,HB],
    [AH,BH,BH,HA,BH,HA,HA,HA,HA,BH,BH,HB],
    [BH,HA,BH,HA,HA,HA,BH,HB,HA,HA,HA,HA],
    [HA,BH,BH,BH,HA,HA,BH,BH,HB,HA,BH,HA],
    [BH,BH,HA,HA,BH,HA,AH,HB,HB,AH,HB,HB],
    [HA,AH,HB,AH,HB,BH,HB,AH,HB,HB,HB,HB],
    [BH,BH,HA,HA,AH,AH,AH,AH,AH,HB,HB,BH],
    [AH,AH,HB,AH,HB,HA,AH,AH,AH,HB,HA,HB],
    [BH,BH,AH,HA,HA,HA,BH,BH,BH,HA,HA,HB],
    [BH,BH,BH,HA,BH,HB,HA,HA,BH,BH,HA,HB],
    [BH,BH,BH,HA,HA,HA,AH,HB,BH,AH,HB,HB],
    [AH,HB,HA,BH,AH,BH,BH,HA,HA,BH,HA,HA],
    [BH,AH,AH,HB,AH,HB,HB,HB,HB,BH,BH,HB],
    [AH,BH,HA,AH,BH,AH,AH,AH,HB,HB,AH,HB],
    [BH,AH,AH,HB,BH,HA,BH,HA,BH,BH,HA,HA],
    [AH,HB,BH,AH,HB,HB,HB,HB,AH,HB,AH,HB],
    [HA,BH,HB,HA,AH,AH,AH,AH,AH,HB,HB,HB],
    [HB,AH,BH,AH,AH,AH,AH,HB,HB,HB,AH,HA],
    [HA,HB,BH,BH,HA,HA,HA,BH,BH,BH,HA,HA],
    [BH,BH,HA,AH,AH,HB,AH,HB,BH,HB,HB,HB],
    [HB,BH,AH,HA,BH,BH,HA,BH,BH,BH,HA,HA],
    [HA,BH,AH,AH,AH,AH,AH,HB,HB,HB,AH,BH],
    [BH,HA,BH,BH,BH,HA,HB,HA,HA,HA,HB,BH],
    [AH,AH,AH,HB,HB,HB,AH,AH,AH,HB,HA,AH],
    [BH,HA,BH,BH,HA,HA,HA,HA,BH,AH,AH,HB],
    [BH,HA,BH,HA,HA,HA,HA,HA,HA,HA,HB,AH],
    [HA,BH,BH,AH,AH,HB,HB,HB,HB,AH,HB,HB],
    [AH,AH,BH,HB,HB,BH,HB,AH,AH,HB,HB,HB],
    [BH,HA,BH,HA,HA,HA,HA,HA,BH,HA,HB,HB],
    [BH,HA,BH,HA,BH,BH,AH,BH,HA,HA,HA,HB],
    [BH,HB,AH,AH,AH,HB,HA,HB,AH,HB,HB,HB],
    [AH,AH,AH,HA,HB,HB,HB,HB,AH,HB,AH,HB],
  ],
  17: [
    [HA,AH,BH,AH,AH,AH,AH,HA,HB,HB,HB,HB],
    [AH,AH,AH,HB,AH,HB,AH,HA,AH,HA,HB,HB],
    [HB,HB,BH,BH,HA,BH,BH,HA,HA,HB,HA,HA],
    [HB,HB,HB,AH,BH,BH,BH,BH,HA,HA,HA,HA],
    [AH,AH,AH,AH,AH,BH,HB,HB,BH,HB,HB,HB],
    [AH,BH,AH,HB,HB,AH,HB,AH,AH,HB,HB,BH],
    [AH,BH,AH,AH,HA,AH,AH,HB,HB,HB,HA,HB],
    [AH,BH,HA,AH,HB,HB,AH,AH,AH,HB,HB,HB],
    [BH,AH,BH,BH,BH,HA,BH,HA,AH,BH,HA,HA],
    [HB,HB,BH,BH,HA,BH,HA,BH,HA,HA,HB,HA],
    [AH,AH,HB,HB,HB,HA,AH,HB,AH,AH,HB,HB],
    [AH,HB,AH,AH,HB,HB,AH,AH,HB,HB,AH,AH],
    [AH,AH,AH,HB,HB,HB,BH,HB,HB,HB,HA,BH],
    [BH,BH,AH,HA,BH,HA,BH,HA,HA,HB,HA,HB],
    [AH,BH,HB,AH,AH,AH,HB,AH,AH,HB,HA,HB],
    [HA,AH,HB,HB,AH,AH,AH,HB,AH,HB,AH,HB],
    [AH,AH,AH,HB,AH,HB,HA,HB,HB,HB,BH,AH],
    [BH,BH,HA,BH,BH,HA,BH,BH,HB,HA,HA,BH],
    [AH,AH,BH,BH,BH,BH,BH,HB,HA,BH,HA,HA],
    [AH,AH,HB,AH,AH,HB,HB,HA,HB,HB,BH,AH],
    [HA,BH,BH,BH,HB,BH,BH,HA,BH,BH,HA,HA],
    [BH,BH,HA,HA,AH,BH,BH,HA,HA,BH,HA,HB],
    [AH,AH,HB,AH,AH,HA,AH,HB,HB,HB,HA,HA],
    [AH,HB,HA,BH,BH,BH,HA,HA,HA,HA,HA,BH],
    [AH,HA,HA,BH,BH,BH,HA,HA,BH,BH,HA,HA],
    [AH,AH,HB,AH,HA,AH,HB,HB,AH,HB,HA,HB],
    [HB,AH,HB,AH,AH,AH,HB,HB,HA,HB,HB,HA],
    [HA,AH,AH,AH,AH,HB,AH,AH,HA,AH,HB,HB],
    [AH,HB,HB,AH,HB,HB,AH,HB,HB,HA,HB,HB],
    [AH,AH,AH,HB,HB,HB,BH,HA,HA,BH,HA,HB],
    [HA,AH,HB,BH,BH,BH,BH,HA,HA,HB,HA,HA],
    [BH,BH,BH,BH,HA,BH,HA,HB,BH,HA,HB,HB],
  ],
  18: [
    [BH,AH,AH,AH,AH,HB,AH,HA,AH,AH,HB,HB],
    [HA,BH,BH,HA,BH,HA,BH,BH,BH,HA,BH,HA],
    [AH,AH,HB,HB,AH,AH,HB,HB,HB,BH,HA,BH],
    [BH,BH,HA,HA,BH,HA,BH,HA,AH,BH,HA,HA],
    [HB,BH,HA,BH,BH,BH,AH,HA,HA,HA,HA,HA],
    [AH,HB,BH,HA,BH,HA,BH,HA,BH,BH,HA,HA],
    [HB,AH,BH,BH,BH,BH,BH,HA,BH,HA,HA,BH],
    [HB,BH,HA,HA,AH,BH,BH,BH,HA,HA,HA,HA],
    [HA,HA,AH,AH,AH,HB,HB,AH,HB,HB,HB,BH],
    [AH,AH,HB,AH,AH,HB,HB,HB,HB,AH,BH,AH],
    [HB,AH,AH,BH,BH,BH,HA,HA,HA,HA,HA,HB],
    [HA,AH,HB,AH,HB,AH,AH,HB,AH,HB,HB,HA],
    [HB,AH,AH,HB,AH,HA,AH,AH,AH,HB,HB,HB],
    [AH,HB,AH,HA,AH,AH,HB,HB,HB,HB,HB,HA],
    [BH,BH,AH,BH,BH,HA,HA,BH,HA,HA,AH,HA],
    [AH,AH,HB,AH,HB,AH,HB,HA,AH,HB,HB,BH],
    [AH,AH,AH,BH,AH,HB,HB,HB,HB,HA,HA,HB],
    [BH,HA,BH,AH,AH,HB,AH,HB,HB,HB,HB,HA],
    [HB,AH,AH,HB,AH,AH,HA,HB,AH,HB,HB,HB],
    [AH,AH,HB,HA,BH,BH,HA,BH,HA,HA,HA,HA],
    [AH,HB,BH,HB,HB,AH,AH,HB,AH,HB,HB,HB],
    [AH,AH,HB,HA,AH,AH,AH,AH,HB,HB,HB,BH],
    [BH,BH,BH,HA,HA,HA,HA,HA,HB,HB,HB,BH],
    [BH,BH,BH,BH,HA,AH,AH,HA,HA,HA,HA,HA],
    [AH,AH,AH,HB,HA,HB,AH,HB,AH,HB,HB,HA],
    [AH,BH,AH,AH,AH,AH,HB,HB,AH,HB,BH,HA],
    [AH,HB,AH,AH,AH,HA,AH,HB,HB,HB,HB,BH],
    [AH,AH,AH,HB,HB,BH,HB,HB,HB,AH,HB,HA],
    [BH,BH,HA,HA,BH,BH,HA,HA,HA,AH,HB,AH],
    [AH,AH,HB,HB,AH,HB,BH,AH,HB,HB,HB,HA],
    [BH,AH,BH,HA,BH,BH,BH,HA,HA,HA,BH,HB],
    [BH,HA,AH,BH,BH,BH,BH,HA,HA,BH,HA,HB],
  ],
  19: [
    [BH,AH,HB,HB,BH,BH,BH,HA,HA,HA,HA,HA],
    [AH,HA,AH,AH,AH,AH,HB,HB,HB,HB,BH,HA],
    [BH,AH,AH,BH,AH,BH,BH,HA,HA,HA,HA,HA],
    [BH,HA,AH,BH,HA,BH,HA,HA,HA,HA,HA,HB],
    [HB,BH,BH,BH,HA,AH,BH,HA,HA,BH,HA,HA],
    [BH,AH,HB,BH,AH,AH,AH,HB,HB,HB,HB,HA],
    [AH,AH,BH,AH,AH,AH,HB,HB,HB,HB,BH,BH],
    [BH,HA,BH,BH,AH,BH,BH,HA,HA,HA,HA,BH],
    [HB,AH,AH,AH,AH,HB,HA,HB,HB,AH,HB,HB],
    [BH,BH,BH,BH,HA,HA,HA,BH,HB,HA,AH,HB],
    [HB,BH,BH,BH,BH,HA,HA,HA,HB,HA,HA,BH],
    [BH,BH,AH,HA,BH,HA,HA,BH,BH,BH,HA,HA],
    [AH,BH,BH,BH,HB,BH,HA,HA,HA,BH,HA,HA],
    [BH,BH,AH,BH,BH,HA,AH,HA,BH,HA,HA,HA],
    [BH,BH,BH,BH,HB,BH,BH,BH,HA,HA,HA,AH],
    [AH,AH,HA,AH,AH,HB,HB,HB,HB,HB,HB,AH],
    [BH,BH,HA,BH,BH,HB,BH,BH,HA,HA,BH,HA],
    [AH,BH,AH,HB,HB,HB,HB,HB,AH,HB,HB,HB],
    [HA,BH,BH,BH,HA,HA,BH,HA,HA,BH,HB,HA],
    [AH,BH,AH,HA,BH,BH,HA,HA,HA,BH,HA,HA],
    [AH,HB,AH,AH,HB,AH,AH,HB,HA,HB,HB,HA],
    [AH,AH,HB,HA,AH,AH,HB,AH,HB,HB,HB,HA],
    [AH,BH,BH,BH,HA,HA,HA,BH,HA,HA,BH,HB],
    [AH,AH,HB,HA,AH,AH,AH,AH,HB,HB,AH,HB],
    [BH,BH,BH,HA,BH,HA,AH,AH,AH,HB,HB,HB],
    [BH,HA,BH,HB,BH,BH,BH,HA,HA,HA,HA,HB],
    [BH,BH,BH,BH,HA,BH,HA,HA,HB,HA,AH,AH],
    [BH,HA,BH,AH,AH,AH,AH,HB,AH,AH,HB,HB],
    [BH,AH,BH,BH,HA,BH,HA,HA,HA,HA,AH,AH],
    [HB,BH,BH,HA,BH,BH,BH,HA,HA,BH,HA,HB],
    [AH,AH,BH,BH,BH,HA,BH,BH,BH,BH,HA,HA],
    [HA,AH,AH,AH,HB,AH,HB,HB,HB,HB,AH,BH],
  ],
  20: [
    [BH,BH,AH,BH,HA,HA,HA,HA,HA,HA,HA,BH],
    [AH,AH,AH,HB,HB,BH,BH,HA,BH,HA,HA,HA],
    [BH,AH,HA,AH,BH,BH,HA,BH,HA,HA,HA,HA],
    [HB,AH,AH,HB,HB,AH,HB,AH,HB,HB,AH,HB],
    [BH,HA,BH,HA,BH,HA,HA,HA,BH,HA,HA,AH],
    [AH,HB,BH,BH,AH,BH,BH,HA,BH,HA,HA,HA],
    [BH,HA,BH,BH,HA,HA,HA,HA,HA,HA,HB,AH],
    [AH,AH,AH,BH,BH,HA,BH,HA,BH,HA,HA,HA],
    [AH,AH,AH,AH,HB,AH,HB,HB,HA,AH,HB,BH],
    [BH,HA,BH,BH,BH,HA,HA,HB,HA,HA,HA,HB],
    [BH,BH,HA,AH,AH,AH,AH,HB,HB,HB,HB,BH],
    [BH,BH,HB,BH,BH,HA,BH,HA,HA,HA,HA,AH],
    [BH,BH,BH,BH,HA,HA,HB,HA,BH,HA,HA,AH],
    [BH,BH,BH,BH,HA,BH,HA,AH,HA,HA,HB,HA],
    [BH,HA,BH,BH,BH,HA,HA,BH,HA,HA,HB,AH],
    [BH,BH,BH,BH,BH,HA,HB,HA,HA,BH,HA,HB],
    [AH,BH,HA,BH,BH,BH,BH,BH,HA,HA,HA,BH],
    [AH,AH,AH,HB,HB,AH,AH,AH,AH,HB,HB,AH],
    [AH,AH,AH,BH,HB,HB,HB,AH,HB,HB,HB,HA],
    [HB,AH,HB,HB,AH,AH,HB,AH,AH,HB,HB,HB],
    [AH,HB,AH,AH,AH,BH,HB,AH,AH,HB,HB,HB],
    [BH,AH,AH,AH,HB,HB,AH,HA,AH,HB,HB,HB],
    [AH,AH,AH,BH,BH,AH,HB,HB,HB,HB,HB,HB],
    [AH,AH,HB,HB,AH,HB,BH,HB,HB,HB,HB,HB],
    [AH,AH,AH,AH,AH,HB,AH,AH,HA,AH,HB,HB],
    [BH,AH,BH,BH,BH,BH,HA,HA,HA,HA,BH,BH],
    [AH,AH,AH,HB,BH,AH,AH,AH,HB,HB,HB,HA],
    [AH,BH,AH,BH,AH,HB,HB,HB,HB,HB,HB,HB],
    [AH,BH,BH,HA,BH,AH,BH,HA,BH,HA,HA,HA],
    [BH,AH,BH,HA,HA,BH,HA,HA,BH,BH,HA,HA],
    [AH,HB,HA,AH,AH,AH,HB,HB,AH,HB,HB,HB],
    [AH,HB,AH,AH,HB,AH,AH,AH,HA,HB,HB,HB],
  ],
  21: [
    [BH,BH,HA,BH,HA,HA,BH,HA,HA,HA,HB,BH],
    [BH,AH,BH,HA,HA,BH,BH,HA,HA,HA,HA,HB],
    [AH,HB,AH,AH,HB,HB,HB,AH,HB,HA,HB,HB],
    [AH,AH,HB,AH,HB,AH,AH,HB,BH,HB,HB,HB],
    [BH,BH,BH,HA,BH,HA,BH,HA,HB,HA,HA,BH],
    [AH,AH,HB,AH,BH,AH,HB,AH,HB,AH,HB,HB],
    [AH,AH,AH,BH,BH,BH,BH,HA,HA,BH,HA,HA],
    [BH,BH,BH,HA,BH,HA,HA,HA,HA,HB,BH,HB],
    [AH,BH,AH,AH,HB,AH,HB,HB,HB,AH,HB,HA],
    [AH,BH,BH,AH,AH,HB,HB,AH,AH,HB,HB,HB],
    [AH,BH,AH,HB,AH,HB,HB,HB,AH,AH,HB,HB],
    [AH,BH,BH,BH,BH,HA,BH,HA,HA,HA,HB,BH],
    [AH,AH,HB,HB,HB,HB,AH,HB,HB,HB,AH,HB],
    [AH,HB,AH,AH,HB,AH,AH,AH,HB,HA,HB,HB],
    [HB,BH,BH,AH,HA,BH,BH,HA,HA,HA,HA,HA],
    [BH,BH,BH,AH,BH,HA,HA,BH,HA,HA,HB,HA],
    [BH,HA,BH,HA,HA,BH,BH,HA,HA,HA,HB,HA],
    [HB,AH,AH,AH,AH,AH,AH,AH,HB,HB,HB,BH],
    [AH,HB,AH,AH,AH,HB,AH,HB,BH,HB,HB,HB],
    [BH,HA,BH,BH,HA,HA,AH,BH,HA,HA,HA,HA],
    [HB,BH,BH,BH,BH,HA,HA,HA,HA,HA,AH,HA],
    [BH,AH,BH,BH,HA,AH,BH,BH,HA,HA,HA,HA],
    [AH,AH,AH,HB,HB,AH,HB,HB,AH,HB,BH,HA],
    [BH,BH,BH,BH,HA,BH,HA,BH,HA,HA,AH,BH],
    [AH,BH,BH,HA,HA,HA,HA,BH,BH,HA,HA,HA],
    [HB,HB,AH,AH,HB,AH,HB,AH,HB,HB,HB,HB],
    [AH,AH,AH,HB,AH,AH,AH,HA,HB,AH,HB,HB],
    [BH,BH,BH,HA,HA,HA,HA,HA,BH,HA,HB,HB],
    [BH,AH,AH,HB,AH,AH,HB,HB,AH,HB,HB,BH],
    [AH,AH,AH,AH,HA,AH,HB,HB,AH,AH,HB,HB],
    [HA,BH,BH,BH,BH,HA,HA,HA,HA,HA,HB,AH],
    [BH,BH,BH,BH,HA,AH,BH,HA,HA,HA,HB,HA],
  ],
  22: [
    [BH,BH,BH,HA,BH,BH,HA,BH,HA,BH,BH,HA],
    [HB,AH,AH,BH,AH,AH,HB,HB,AH,HB,HB,HB],
    [AH,AH,AH,AH,HB,AH,HB,AH,HB,BH,HB,HB],
    [HA,BH,HA,BH,HA,BH,HA,BH,HA,HA,HA,HA],
    [BH,BH,BH,AH,HA,HA,HA,HA,HA,HA,HA,HA],
    [BH,AH,AH,AH,AH,AH,HB,AH,HA,HB,HB,HB],
    [BH,BH,BH,HA,BH,BH,HA,BH,HA,BH,BH,HA],
    [BH,HA,BH,BH,HA,BH,HA,BH,HA,HB,HA,HA],
    [AH,AH,HA,HB,AH,AH,AH,AH,HB,HB,HB,HB],
    [BH,BH,HA,BH,BH,BH,BH,HA,HA,BH,HA,HB],
    [HA,AH,AH,HB,AH,HB,HB,HB,HB,AH,HB,HB],
    [BH,AH,AH,AH,AH,AH,AH,HA,HB,HB,HB,HB],
    [HB,BH,BH,HA,BH,HA,BH,BH,HA,BH,HA,HA],
    [BH,BH,BH,BH,BH,BH,BH,HA,HA,HB,BH,HA],
    [AH,AH,HB,BH,AH,AH,AH,HB,HB,HB,HB,HA],
    [AH,BH,HB,HB,AH,AH,AH,HB,HB,HB,HB,HB],
    [BH,AH,AH,AH,HB,HB,HB,AH,HB,HB,HB,BH],
    [BH,HA,BH,AH,BH,BH,HA,HA,HA,BH,HA,HA],
    [AH,HB,HB,AH,AH,AH,HB,AH,HB,HB,HB,HA],
    [AH,AH,BH,BH,BH,BH,BH,HA,HA,HA,HA,AH],
    [AH,HB,AH,AH,HB,AH,HB,AH,HB,HA,HB,HB],
    [AH,AH,HB,HB,AH,AH,AH,AH,HB,HB,HB,BH],
    [BH,BH,BH,HA,HA,HA,HA,HA,HB,BH,HA,HA],
    [BH,BH,HA,HA,BH,HA,BH,HA,HA,HB,HA,HA],
    [AH,AH,BH,BH,BH,BH,BH,HA,HA,HA,HA,BH],
    [AH,AH,AH,AH,HB,AH,AH,HA,HB,AH,HB,HB],
    [HB,BH,BH,HA,HA,HA,BH,BH,HA,HA,HA,HA],
    [BH,AH,BH,HA,HA,BH,BH,HA,HA,BH,HA,HA],
    [BH,BH,BH,HA,HA,HA,BH,HA,HA,HA,HB,BH],
    [BH,HA,BH,BH,BH,BH,HA,HA,HA,BH,HA,AH],
    [HA,BH,BH,BH,HA,BH,BH,HA,BH,BH,HA,HA],
    [BH,AH,AH,BH,AH,AH,HB,HB,HB,AH,HB,HB],
  ],
  23: [
    [AH,AH,AH,AH,AH,HB,HB,AH,BH,HB,HB,HB],
    [AH,HA,BH,BH,HA,BH,BH,HA,HA,HA,HA,HA],
    [AH,AH,HB,AH,AH,HA,AH,HB,HB,HB,HB,HB],
    [BH,BH,HB,BH,BH,HA,HA,BH,HA,HA,HA,HA],
    [AH,BH,HA,BH,BH,BH,BH,HA,HA,HA,HA,HB],
    [BH,AH,AH,AH,HB,HB,AH,HB,AH,AH,HB,HB],
    [HA,BH,BH,BH,HA,BH,HA,HA,HA,HA,HA,AH],
    [AH,AH,AH,AH,HB,HB,AH,HB,HB,HA,HA,HB],
    [AH,BH,BH,HA,HA,BH,HA,BH,BH,HA,HA,HA],
    [BH,BH,BH,HA,BH,HA,BH,HA,HA,HA,HB,AH],
    [BH,HA,BH,BH,BH,HA,HA,BH,BH,BH,HA,HA],
    [BH,BH,BH,HA,BH,HA,HA,BH,HA,BH,HA,HB],
    [HA,AH,AH,AH,AH,AH,AH,HB,HB,HA,HB,HB],
    [AH,AH,AH,HB,AH,AH,AH,AH,HB,HA,HB,HB],
    [BH,BH,BH,BH,HA,HA,HA,BH,HA,AH,HA,HA],
    [AH,HB,AH,AH,AH,HB,HB,HB,AH,HB,HB,AH],
    [BH,BH,AH,BH,BH,HA,HA,HA,HA,HA,HA,AH],
    [BH,BH,HA,BH,HA,HA,HA,HA,HA,HA,HA,BH],
    [BH,BH,HA,HA,BH,HA,BH,HA,HA,HA,HA,BH],
    [AH,BH,AH,AH,AH,HB,HB,AH,HB,HB,HA,HB],
    [BH,AH,AH,AH,AH,HB,AH,HB,AH,HB,AH,HB],
    [HA,HB,BH,BH,BH,HA,BH,BH,HA,HA,HA,HA],
    [AH,AH,AH,BH,BH,BH,BH,HA,HA,HA,HA,HA],
    [BH,BH,HA,BH,HA,HA,HA,HA,BH,HA,HA,HB],
    [AH,AH,AH,AH,HA,AH,HB,HB,HB,AH,HB,HB],
    [BH,HA,BH,BH,HA,HA,BH,HA,BH,BH,HA,HA],
    [BH,BH,BH,HA,HA,BH,BH,BH,HA,HB,HA,HA],
    [AH,BH,BH,HA,BH,BH,HA,BH,HA,HA,HA,HB],
    [BH,AH,BH,BH,AH,BH,BH,HA,HA,HA,HA,HA],
    [BH,AH,BH,BH,BH,HA,HA,HA,BH,HA,HA,HB],
    [BH,HA,AH,AH,AH,AH,HB,HB,HB,HB,HB,HA],
    [HB,AH,AH,AH,AH,AH,HB,AH,HB,HB,HA,HB],
  ],
  24: [
    [AH,AH,AH,AH,AH,HB,AH,HB,HB,HB,HA,AH],
    [BH,HA,BH,BH,BH,BH,HA,BH,HA,HA,HB,HA],
    [BH,AH,AH,HB,AH,HB,HB,AH,AH,HB,HB,HB],
    [AH,AH,BH,AH,HB,HB,HB,AH,HB,HB,HB,HB],
    [BH,BH,BH,HA,BH,HA,HA,HA,AH,HA,HA,HA],
    [HA,BH,BH,BH,BH,BH,HA,BH,HA,HA,BH,HA],
    [AH,AH,AH,HB,HB,HB,HB,HB,HB,HB,HA,HB],
    [HA,BH,BH,BH,BH,HA,BH,HA,HA,HA,HB,HA],
    [AH,HB,AH,AH,AH,AH,HB,HB,HA,HB,HB,HB],
    [BH,HA,HA,BH,BH,BH,HA,HA,HA,BH,HA,HA],
    [BH,HA,HA,BH,BH,BH,BH,HA,HA,BH,HA,HA],
    [HA,BH,BH,HA,BH,BH,HA,BH,BH,HA,HA,HA],
    [HA,AH,AH,AH,AH,AH,AH,AH,AH,HB,HB,HB],
    [AH,HB,AH,HB,AH,HB,HB,HB,AH,HB,HB,HB],
    [BH,BH,BH,BH,BH,AH,BH,BH,HA,HA,HA,HA],
    [AH,AH,HB,HB,HB,AH,HB,AH,AH,HB,HB,HB],
    [BH,AH,AH,HB,AH,AH,AH,HB,HB,HB,AH,HB],
    [BH,AH,AH,BH,BH,BH,HA,HA,HA,HA,HA,HA],
    [BH,BH,AH,BH,BH,BH,HA,BH,HA,BH,HA,HA],
    [AH,AH,AH,HB,HB,AH,AH,AH,HB,HB,HB,AH],
    [BH,BH,BH,BH,BH,BH,HA,HA,HB,HA,BH,HA],
    [BH,AH,BH,BH,HA,HA,HA,HA,BH,HA,HA,HA],
    [BH,BH,HA,BH,HA,BH,BH,HA,HA,HB,HA,HA],
    [HA,BH,BH,BH,BH,BH,BH,HA,HA,HA,HA,BH],
    [BH,BH,BH,BH,BH,HA,HA,HB,HA,HA,HA,HB],
    [BH,AH,AH,BH,BH,BH,HA,BH,HA,HA,HA,HA],
    [HB,AH,AH,HB,HB,AH,AH,AH,HB,HB,HB,HB],
    [BH,BH,HA,BH,BH,HA,BH,HA,HB,HA,HA,HA],
    [HA,BH,BH,BH,BH,BH,HA,HA,BH,BH,HA,HA],
    [BH,BH,HA,BH,BH,BH,HA,HB,HA,HA,HA,HA],
    [BH,HA,BH,BH,BH,BH,BH,HA,HA,HB,HA,HA],
    [AH,AH,BH,HB,AH,AH,HB,HB,AH,HB,HB,HB],
  ],
};

// Evaluator
// ---------

async function runChallenge(system, model, level) {
  const term = instances[level][Math.floor(Math.random() * instances[level].length)];
  const params = { temperature: 0, model, debug: true };
  const [norm, rwts] = normal(term);

  LOG(`Term: ${show(term)}`);
  LOG(`Params: ${JSON.stringify(params)}`);
  LOG(`Norm: ${show(norm)}`);
  LOG(`Rwts: ${rwts}`);
  LOG(``);
  LOG(`AI-RESPONSE:`);

  const problem = 
`INPUT: ${show(term)}
===

ASSISTANT START PROGRAM BELOW AT STEP 1.
BEGIN RESPONSE WITH \`TAPE\`.`;

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
    }
  }

  LOG('')
  LOG("--- Final score ---");
  LOG(`${correct} / ${RUNS} (${(100 * correct / RUNS).toFixed(2)}%)`)
}

const prompt = await fs.readFile(`./users/${USER}/prompt.txt`, "utf-8");
const model = (await fs.readFile(`./users/${USER}/model.txt`, "utf-8")).trim();

LOG("USER: " + USER);
LOG("MODEL: " + model);
LOG("PROMPT:");
LOG(prompt);
LOG("");

await runFullChallenge(prompt, model);
await fs.writeFile(`./users/${USER}/log.txt`, OUTPUT);
