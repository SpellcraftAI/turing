import type { ChatCompletionMessageParam } from "openai/resources"
import type { MessageParam } from "@anthropic-ai/sdk/resources"

import { AnthropicVertex } from "@anthropic-ai/vertex-sdk"
import { readFile } from "fs/promises"
import OpenAI from "openai"
import { homedir } from "os"
import { join } from "path"
import chalk from "chalk"
import { longFormat } from "./utils"

const { ANTHROPIC_API_KEY, OPENAI_API_KEY } = process.env

export async function getAnthropicKey() {
  if (ANTHROPIC_API_KEY) {
    return ANTHROPIC_API_KEY
  }

  const keyPath = join(homedir(), ".config", "anthropic.token")
  return (await readFile(keyPath, "utf8")).trim()
}

export async function getOpenAIKey() {
  if (OPENAI_API_KEY) {
    return OPENAI_API_KEY
  }

  const keyPath = join(homedir(), ".config", "openai.token")
  return (await readFile(keyPath, "utf8")).trim()
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
  startToken: string | null;
}

export type TestResult = {
  pass: boolean;
  text: string;
  metadata: unknown;
}

function checkRollingSolution(output: string, solution: string) {
  const correct = solution.trim()
  const actual = output.trim()

  if (!correct.startsWith(actual)) {
    console.log(chalk.bold(chalk.red("INCORRECT")))
    console.log(chalk.red("Output did not match solution."))
    console.log()

    let i = 0
    const correctLines = correct.split("\n")
    const actualLines = actual.split("\n")
    while (i < actualLines.length) {
      const correctLine = (correctLines?.[i] || "").padEnd(60)
      const actualLine = (actualLines?.[i] || "").padEnd(60)
      const isCorrect = correctLine.trim() === actualLine.trim()
      
      console.log(
        `${chalk.green(correctLine)} | ${isCorrect ? chalk.dim(chalk.green(actualLine)) : chalk.red(actualLine)}`
      )

      i++
    }

    console.log()
    return false
  }

  return true
}

export async function testWithClaude({ 
  system, 
  messages, 
  max_tokens, 
  model = "claude-3-opus-20240229", 
  temperature = 0, 
  main = false,
  startToken,
  solution,
}: ClaudeTestOptions): Promise<TestResult> {
  // const apiKey = await getAnthropicKey()  
  // const anthropic = new Anthropic({ apiKey });
  const anthropic = new AnthropicVertex({
    region: "us-east5",
    projectId: "research-420207"
  })

  let responseCount = 0
  let inputTokens = 0
  let outputTokens = 0
  let totalTokens = 0

  while (true) {
    console.log()
    console.log(chalk.bold(chalk.yellow(`Response ${responseCount + 1}:`)))
    console.log()
    
    const assistantMessages = messages.filter(({ role }) => role === "assistant")

    /**
     * Select last {responseCount} assistant messages.
     */
    const priorContent = 
      assistantMessages
        .slice(assistantMessages.length - responseCount)
        .map(({ content }) => content)
        .join("")

    // console.log({ assistantMessages, responseCount, priorContent })

    /**
     * Clear the start token instruction when continuing responses.
     */
    if (responseCount > 0) {
      startToken = null
    }

    if (startToken && system) {
      system = `${system}\n---\nBEGIN RESPONSE WITH: ${startToken}\n`
    }
        
    let output = priorContent
    
    const stream = anthropic.messages.stream({
      model,
      messages,
      max_tokens: max_tokens || 4096,
      temperature,
      ...(system && { system }),
    })
      
    const failed = new Promise<TestResult>((resolve) => {
      const onText = (text: string) => {
        output += text
        if (main) {
          process.stdout.write(text)
        }
  
        const correct = checkRollingSolution(output, solution)
        if (!correct) {
          stream.off("text", onText)
          resolve({ 
            pass: false, 
            text: output, 
            metadata: null
          })
        }
      }
  
      stream.on("text", onText)
    })
  
    const failedOrMessage = await Promise.race([failed, stream.finalMessage()])
    if ("pass" in failedOrMessage) {
      stream.abort()
      const failedResult = failedOrMessage
      return failedResult
    }
      
    const message = failedOrMessage
    const { content, ...metadata } = message
    const overflow = metadata.stop_reason === "max_tokens"

    if (overflow) {
      inputTokens += metadata.usage.input_tokens
      outputTokens += metadata.usage.output_tokens
      totalTokens += (metadata.usage.input_tokens + metadata.usage.output_tokens)
      
      /**
       * Drop the last line from an incomplete response.
       */
      const completed = content[0].text.split("\n").slice(0, -1).join("\n")
      messages.push(
        { role: "assistant", content: `${completed}\n` },
        { role: "user", content: "CONTINUE" }
      )

      console.log("\n")
      console.log(chalk.gray("Continuing response."))
      console.log(chalk.gray(`Input tokens: ${chalk.bold(longFormat(inputTokens))}`))
      console.log(chalk.gray(`Output tokens: ${chalk.bold(longFormat(outputTokens))}`))
      console.log(chalk.gray(`Total tokens: ${chalk.bold(longFormat(totalTokens))}`))
      console.log(chalk.bold(chalk.yellow("Waiting 60s...")))

      await new Promise(resolve => setTimeout(resolve, 60_000))
      responseCount++
      continue
    }
  
    return {
      pass: true,
      text: content[0].text,
      metadata
    }
  }
}

export interface GPTTestOptions {
  system?: string;
  messages: ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
  main?: boolean;
  solution: string;
}

// TODO: Implement testWithGPT
export async function testWithGPT({
  system, 
  messages, 
  model, 
  temperature,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  main = false,
  solution,
}: GPTTestOptions): Promise<TestResult> {
  const openai = new OpenAI({ apiKey: await getOpenAIKey() })
  const stream = await openai.chat.completions.create({
    model: model || "gpt-4-0125-preview",
    messages: [
      { role: "system", content: system || "You're a helpful assistant." },
      ...messages
    ],
    stream: true,
    max_tokens: 1600,
    temperature: temperature || 0,
  })

  let result = ""
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || ""
    result += text

    if (!solution.trim().startsWith(result.trim())) {
      console.log(chalk.bold(chalk.red("INCORRECT")))
      console.log(chalk.red("Output did not match solution."))
      return {
        pass: false,
        text: result,
        metadata: null
      }
    }
  }

  console.log(chalk.bold(chalk.green("CORRECT")))
  console.log(chalk.green("Output exactly matched solution."))

  return {
    pass: true,
    text: result,
    metadata: null
  }
}