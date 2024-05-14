import { resolve, dirname } from "path"
import { writeFile } from "fs/promises"

export function format(tape: string | number[], join = "") {
  if (Array.isArray(tape)) tape = tape.join("")
  tape = tape.replace(/0/g, "░").replace(/1/g, "█")
  return tape.split("").join(join)
}

export function positions(tape: string[] | number[]): string {
  return tape.map((v, i) => `${i}${v}`).join(" ")
}


export function positionFormat(tape: (0 | 1)[], prefix = ""): string {
  return tape.map((v, i) => `${`${prefix}${i}`}${format([v])}`).join(" ")
}

export function integerToBinaryTape(
  num: number, 
  log?: (...args: string[]) => void
): string {
  if (num < 0) {
    throw new Error("Only non-negative integers are supported.")
  }

  let binary = ""

  // const totalBits = Math.floor(Math.log2(num)) + 1

  while (num > 0) {
    const quotient = Math.floor(num / 2)
    const remainder = num % 2

    // const padLength = totalBits.toString().length + 1
    const indexLabel = `${binary.length}`.padEnd(3)

    log?.(`${indexLabel} ${num} ${quotient} ${remainder} ${format([remainder])} ${binary.length}${format([remainder])}`)

    binary = remainder + binary // prepend remainder to form the correct binary number
    num = quotient
  }

  const binaryTape = binary.split("").map(Number) as (0 | 1)[]
  
  log?.("REINDEX")
  for (let i = binaryTape.length - 1; i >= 0; i--) {
    const newIndex = binaryTape.length - (i + 1)
    log?.(`${i}${format([binaryTape[newIndex]])} ${newIndex}${format([binaryTape[newIndex]])}`)
  }
  // log?.(`OUT ${reversed}`)

  return binary
}

export function binaryTapeToInteger(tape: (0|1)[], log?: (...args: string[]) => void): number {
  let num = 0
  let power = 0

  for (let i = tape.length - 1; i >= 0; i--) {
    const bit = tape[i]
    const scale = Math.pow(2, power)
    const bitValue = bit * scale

    log?.(`${i} ${scale}  ${num} ${bit} ${bitValue} ${format([bit])} → ${num}${format([bit])}`)

    num += bitValue
    power++
  }

  return num
}

export async function clearTrainingTape() {
  const file = resolve(dirname(Bun.main), "train.txt")
  await Bun.write(file, "")
}

export const addToTrainingTape = async <
  Fn extends (...args: Args) => string,
  Args extends unknown[]
>(
  fn: Fn,
  ...args: Args
) => {

  const result = fn(...args)
  const example = `[USER]\n${args.join("\n")}\n\n[ASSISTANT]\n${result}\n\n`

  const file = resolve(dirname(Bun.main), "train.txt")
  await writeFile(file, example, { flag: "a" })
}

export const toPositional = (value: string | number, prefix?: string) => {
  return value.toString().split("").map((v, i) => `${prefix ?? ""}${i}:${v}`).join(" ")
}

export const fromPositional = (positional: string) => {
  return positional.split(" ").map((v) => v.split(":")[1]).join("")
}

export const toPositionalBinary = (num: number) => {
  return toPositional(num.toString(2))
}

export const toPositionalBinaries = (nums: number[]) => {
  return nums.map(toPositionalBinary)
}

export const fromPositionalBinary = (positionalBinary: string): number => {
  const binary = fromPositional(positionalBinary)
  return parseInt(binary, 2)
}