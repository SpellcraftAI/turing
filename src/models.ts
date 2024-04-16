import type { ChatCompletionMessageParam } from "openai/resources";
import type { MessageParam } from "@anthropic-ai/sdk/resources";

import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
import { readFile } from "fs/promises";
import OpenAI from "openai";
import { homedir } from "os";
import { join } from "path"
import chalk from "chalk";

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

export interface ClaudeTestOptions {
  system?: string;
  messages: MessageParam[];
  max_tokens?: number;
  model?: string;
  temperature?: number;
  debug?: boolean;
  main?: boolean;
  solution: string;
}

export type TestResult = {
  pass: boolean;
  text: string;
  metadata: any;
}

export async function testWithClaude({ 
  system, 
  messages, 
  max_tokens, 
  model = 'claude-3-opus-20240229', 
  temperature = 0, 
  debug = true,
  main = false,
  solution,
}: ClaudeTestOptions): Promise<TestResult> {
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

    let output = "";
    
    const failed = new Promise<TestResult>((resolve) => {
      const onText = (text: string) => {
        output += text;
        if (main) {
          process.stdout.write(text)
        }
  
        if (!solution.trim().startsWith(output.trim())) {
          console.log(chalk.bold(chalk.red("INCORRECT")));
          console.log(chalk.red("Output did not match solution."))
          resolve({ pass: false, text: output, metadata: null })
          stream.off('text', onText);
        }
      }

      stream.on('text', onText);
    });
    

    const failedOrMessage = await Promise.race([failed, stream.finalMessage()]);
    if ("pass" in failedOrMessage) {
      stream.abort();
      const failedResult = failedOrMessage;
      return failedResult;
    }
    
    const message = failedOrMessage;
    const { content, ...metadata } = message;

    return {
      pass: true,
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
    pass: true,
    text: content[0].text,
    metadata,
  };
}

export interface GPTTestOptions {
  system?: string;
  messages: ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
  main?: boolean;
  solution: string;
}

export async function testWithGPT({
  system, 
  messages, 
  model, 
  temperature,
  main = false,
  solution,
}: GPTTestOptions): Promise<TestResult> {
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

    if (!solution.trim().startsWith(result.trim())) {
      console.log(chalk.bold(chalk.red("INCORRECT")));
      console.log(chalk.red("Output did not match solution."))
      return {
        pass: false,
        text: result,
        metadata: null
      }
    }
  }

  console.log(chalk.bold(chalk.green("CORRECT")));
  console.log(chalk.green("Output exactly matched solution."))

  return {
    pass: true,
    text: result,
    metadata: null
  };
}