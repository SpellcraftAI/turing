import type { ChatCompletionMessageParam } from "openai/resources";
import type { MessageParam } from "@anthropic-ai/sdk/resources";

import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
import { readFile } from "fs/promises";
import OpenAI from "openai";
import { homedir } from "os";
import { join } from "path"

const { ANTHROPIC_API_KEY, OPENAI_API_KEY } = process.env

export async function getAnthropicKey() {
  if (ANTHROPIC_API_KEY) {
    return ANTHROPIC_API_KEY
  }

  const keyPath = join(homedir(), '.config', 'anthropic.token');
  return (await readFile(keyPath, 'utf8')).trim();
}

export async function getOpenAIKey() {
  if (OPENAI_API_KEY) {
    return OPENAI_API_KEY
  }

  const keyPath = join(homedir(), '.config', 'openai.token');
  return (await readFile(keyPath, 'utf8')).trim();
}

export interface AskClaudeOptions {
  system?: string;
  messages: MessageParam[];
  max_tokens?: number;
  model?: string;
  temperature?: number;
  debug?: boolean;
  main?: boolean;
}

export async function askClaude({ 
  system, 
  messages, 
  max_tokens, 
  model = 'claude-3-opus-20240229', 
  temperature = 0, 
  debug = true,
  main = false,
}: AskClaudeOptions) {
  // const apiKey = await getAnthropicKey()  
  // const anthropic = new Anthropic({ apiKey });
  const anthropic = new AnthropicVertex({
    region: "us-east5",
    projectId: "research-420207"
  });
  
  if (debug) {
    const stream = anthropic.messages.stream({
      model,
      messages,
      max_tokens: max_tokens || 4096,
      temperature,
      ...(system && { system }),
    })

    stream.on('text', (text) => {
      if (main) {
        process.stdout.write(text)
      }
    })

    const message = await stream.finalMessage();
    const { content, ...metadata } = message;

    return {
      text: content[0].text,
      metadata,
    };
  }

  const message = await anthropic.messages.create({
    model,
    messages,
    max_tokens: max_tokens || 4096,
    temperature,
    ...(system && { system }),
  });

  const { content, ...metadata } = message;
  return {
    text: content[0].text,
    metadata,
  };
}

export interface AskGPTOptions {
  system?: string;
  messages: ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
  main?: boolean;
}

export async function askGPT({
  system, 
  messages, 
  model, 
  temperature,
  main = false,
}: AskGPTOptions) {
  const openai = new OpenAI({apiKey: await getOpenAIKey()});
  const stream = await openai.chat.completions.create({
    model: model || "gpt-4-0125-preview",
    messages: [
      {role: "system", content: system || "You're a helpful assistant." },
      ...messages
    ],
    stream: true,
    max_tokens: 1600,
    temperature: temperature || 0,
  });

  var result = "";
  for await (const chunk of stream) {
    var text = chunk.choices[0]?.delta?.content || "";
    result += text;
  }

  return {
    text: result,
    metadata: null
  };
}