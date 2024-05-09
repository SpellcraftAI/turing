export type TapeValue = 0 | 1
export type Tape = TapeValue[]

function format(tape: Tape, join = ""): string {
  return tape.map(v => v === 0 ? "░" : "█").join(join)
}

function intToTape(num: number): Tape {
  const binary = num.toString(2)
  return binary.split("").map(v => Number(v) as TapeValue)
}

function tapeToInt(tape: Tape): number {
  const binary = tape.join("")
  return parseInt(binary, 2)
}

function multiplyTapes(tape1: Tape, tape2: Tape, log: (...args: string[]) => void): Tape {
  const result: Tape = new Array(tape1.length + tape2.length).fill(0)
  log(`Initializing result tape: ${format(result)}`)

  for (let i = tape2.length - 1; i >= 0; i--) {
    log(`\nMultiplying by bit at position ${i} of Tape 2`)
    if (tape2[i] === 1) {
      let carry = 0
      for (let j = tape1.length - 1; j >= 0; j--) {
        const sum = result[i + j + 1] + tape1[j] + carry
        result[i + j + 1] = sum % 2 as TapeValue
        log(`At position ${i + j + 1}:`)
        log(`  Added: ${result[i + j + 1]} + ${tape1[j]} + ${carry}`)
        log(`  Sum: ${sum}`)
        log(`  Bit: ${result[i + j + 1]}`)
        carry = Math.floor(sum / 2)
        log(`  Carry: ${carry}`)
      }
      if (carry > 0) {
        result[i] = carry as TapeValue
        log(`Setting carry at position ${i}: ${carry}`)
      }
      log(`Result after multiplication by bit ${i}: ${format(result)}`)
    } else {
      log("Bit is 0, skipping multiplication")
    }
  }

  log(`\nFinal result: ${format(result)}`)
  return result
}

function multiplyLargeIntegers(num1: number, num2: number): string {
  let output = ""
  const log = (...args: string[]) => {
    output += args.join("\n") + "\n"
  }

  log(`Multiplying ${num1} x ${num2}`)

  const tape1 = intToTape(num1)
  const tape2 = intToTape(num2)

  log(`Tape 1: ${format(tape1)}`)
  log(`Tape 2: ${format(tape2)}`)

  const productTape = multiplyTapes(tape1, tape2, log)
  const product = tapeToInt(productTape)

  log(`Product Tape: ${format(productTape)}`)
  log(`Product: ${product}`)
  log(`Reference: ${num1 * num2}`)

  return output
}

// Example usage:
const num1 = 12345
const num2 = 54321

const result = multiplyLargeIntegers(num1, num2)
console.log(result)