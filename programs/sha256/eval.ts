export type TapeValue = 0 | 1
export type Tape = TapeValue[]

export type Rule = (neighborhood: TapeValue[]) => TapeValue
export type RuleSet = Rule[]

const BLOCK_SIZE = 512
const WORD_SIZE = 32
const NUM_WORDS = 64
const NUM_ROUNDS = 64
const NUM_HASH_WORDS = 8

function format(tape: Tape, join = ""): string {
  return tape.map(v => v === 0 ? "░" : "█").join(join)
}

function stringToTape(input: string): Tape {
  const tape: Tape = []
  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i)
    const binary = charCode.toString(2).padStart(8, "0")
    tape.push(...binary.split("").map(v => Number(v) as TapeValue))
  }
  
  // Padding
  const inputLength = tape.length
  tape.push(1)
  while (tape.length % BLOCK_SIZE !== BLOCK_SIZE - WORD_SIZE) {
    tape.push(0)
  }
  const lengthBinary = inputLength.toString(2).padStart(WORD_SIZE, "0")
  tape.push(...lengthBinary.split("").map(v => Number(v) as TapeValue))
  
  return tape
}

function sha256(input: string): string {
  let output = ""
  const log = (...args: string[]) => {
    output += args.join("\n") + "\n"
    console.log(...args)
  }

  log(`Input: ${input}`)
  const tape = stringToTape(input)
  log(`Initial tape: ${format(tape)}`)

  const K: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]

  const H: number[] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ]

  for (let block = 0; block < tape.length; block += BLOCK_SIZE) {
    log(`Processing block ${block / BLOCK_SIZE}`)
    
    const W: number[] = []
    for (let t = 0; t < BLOCK_SIZE; t += WORD_SIZE) {
      W.push(parseInt(tape.slice(block + t, block + t + WORD_SIZE).join(""), 2))
    }

    for (let t = 16; t < NUM_WORDS; t++) {
      const s0 = rightRotate(W[t-15], 7) ^ rightRotate(W[t-15], 18) ^ (W[t-15] >>> 3)
      const s1 = rightRotate(W[t-2], 17) ^ rightRotate(W[t-2], 19) ^ (W[t-2] >>> 10)
      W[t] = W[t-16] + s0 + W[t-7] + s1
    }

    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7]

    for (let t = 0; t < NUM_ROUNDS; t++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)
      const ch = (e & f) ^ ((~e) & g)
      const temp1 = h + s1 + ch + K[t] + W[t]
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = s0 + maj

      h = g
      g = f
      f = e
      e = (d + temp1) | 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) | 0
    }

    H[0] = (H[0] + a) | 0
    H[1] = (H[1] + b) | 0 
    H[2] = (H[2] + c) | 0
    H[3] = (H[3] + d) | 0
    H[4] = (H[4] + e) | 0
    H[5] = (H[5] + f) | 0
    H[6] = (H[6] + g) | 0
    H[7] = (H[7] + h) | 0
  }

  const outputTape: Tape = []
  for (let i = 0; i < NUM_HASH_WORDS; i++) {
    const binary = H[i].toString(2).padStart(WORD_SIZE, "0")
    outputTape.push(...binary.split("").map(v => Number(v) as TapeValue))
  }

  log(`Output: ${format(outputTape)}`)
  log(`Output (hex): ${tapeToHex(outputTape)}`)

  return output
}

function tapeToHex(tape: Tape): string {
  let hex = ""
  for (let i = 0; i < tape.length; i += 4) {
    const slice = tape.slice(i, i + 4).join("")
    const nibble = parseInt(slice, 2)
    hex += nibble.toString(16)
  }
  return hex
}

function rightRotate(n: number, d: number): number {
  return (n >>> d) | (n << (32 - d))
}

// Example usage:
const input = "Hello, world!"

const result = sha256(input)
console.log(result)
