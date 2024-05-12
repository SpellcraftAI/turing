import { binaryTapeToInteger, format, fromPositionalBinary, integerToBinaryTape, positionFormat } from "../utils"

export type TapeValue = 0 | 1
export type Tape = TapeValue[]


function intToTape(num: number): Tape {
  const binary = num.toString(2)
  return binary.split("").map(v => Number(v) as TapeValue)
}

function multiplyTapes(
  tapeA: Tape, 
  tapeB: Tape, 
  log: (...args: string[]) => void
): Tape {
  const output: Tape = new Array(tapeA.length + tapeB.length).fill(0)
  const keys = [...Object.keys(tapeA), ...Object.keys(tapeB)]

  log(`TAPE A ${positionFormat(tapeA)}`)
  log(`TAPE B ${positionFormat(tapeB)}`)
  // log(`JOIN ${keys.map((k) => k.padStart(2)).join(" ")}`)
  // log(`JOIN ${Object.keys(keys).map((k) => k.padStart(2)).join(" ")}`)

  log("JOIN")
  let joinedIndex = 0

  for (let i = 0; i < tapeA.length; i++) {
    log(`A${i} O${joinedIndex}`)
    joinedIndex++
  }
  
  for (let i = 0; i < tapeB.length; i++) {
    log(`B${i} O${joinedIndex}`)
    joinedIndex++
  }

  log(`OUTPUT ${positionFormat(output)}`)

  let skipped = false
  for (let i = tapeB.length - 1; i >= 0; i--) {
    if (!skipped) {
      log(`A ${positionFormat(tapeA)}`)
      log(`B ${positionFormat(tapeB)}`)
      log("LOOP B")
    }

    skipped = false
    const headB = tapeB[i]
    const headBFmt = format([headB])
    log(`B ${i}${headBFmt}`)

    if (!headB) {
      skipped = true
      continue
    }

    let carry: TapeValue = 0

    log("LOOP A OUTPUT")
    for (let j = tapeA.length - 1; j >= 0; j--) {
      const position = i + j + 1
      const sum = tapeA[j] + output[position] + carry
      const remainder = sum % 2 as TapeValue

      // Logging each step of the computation
      log(`B${i} A${j} ${i+j} ${i+j+1} A${j}${format([tapeA[j]])} O${position}${format([output[position]])}`)
      if (carry) {
        log(`CARRY ${carry}`)
      }

      if (sum) {
        log(`SUM ${sum}`)
      }

      if (remainder) {
        log(`REM ${remainder}`)
      }

      // const remainderLabel = remainder ? ` REM ${remainder}` : ""
      // log(`SUM ${sum}${remainderLabel}`)

      output[position] = remainder // Update the result tape at the current position
      log(`OUT O${position}${format([remainder])}`)

      carry = Math.floor(sum / 2) as TapeValue
      // Logging after setting the bit and carry
      if (carry) {
        log(`CARRY ${carry}`)
      }
    }

    log("LOOP A OUTPUT END")

    if (carry) {
      output[i] = carry as TapeValue
      log(`OUT O${i}${format([carry])}`)
    } else {
      log("NO CARRY")
    }
    
    // log(`OUTPUT ${positionFormat(result)}`)
    log(output.map((v, i) => `O${i}${format([v])}`).join(" "))
  }

  // log(`OUTPUT ${positionFormat(result)}`)
  return output
}

export default function multiply(
  num1: number | string, 
  num2: number | string
): string {
  if (typeof num1 === "string") num1 = fromPositionalBinary(num1)
  if (typeof num2 === "string") num2 = fromPositionalBinary(num2)

  let output = ""
  const log = (...args: string[]) => {
    output += args.join("\n") + "\n"
  }

  log("START")
  // log(`${num1} x ${num2}`)

  // log(`A: ${num1} TO BINARY`)
  // const binaryA = integerToBinaryTape(num1, log).split("").map(Number) as Tape

  // log(`B: ${num2} TO BINARY`)
  // const binaryB = integerToBinaryTape(num2, log).split("").map(Number) as Tape

  const tapeA = intToTape(num1)
  const tapeB = intToTape(num2)

  log("PREPARE")
  const productTape = multiplyTapes(tapeA, tapeB, log)
  log("FROM BINARY")
  const product = binaryTapeToInteger(productTape, log)
  log(`RETURN ${product}`)

  // const product = tapeToInt(productTape)

  // log(`Product Tape: ${format(productTape)}`)
  // log(`Product: ${product}`)
  log(`Reference: ${num1 * num2}`)

  return output.trim()
}

// Example usage:
// const num1 = 41
// const num2 = 22

// const result = multiplyLargeIntegers(num1, num2)
// console.log(result)