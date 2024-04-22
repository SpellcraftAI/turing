export type TapeValue = 0 | 1
export type Tape = TapeValue[]

export type Rule = (left: TapeValue, center: TapeValue, right: TapeValue) => TapeValue
export type RuleNumber = number

const PATTERNS: string[] = ["111", "110", "101", "100", "011", "010", "001", "000"]

const TapeValue = (value: unknown): TapeValue => value as TapeValue

function format(tape: string | number[], join = "") {
  if (Array.isArray(tape)) tape = tape.join("")
  tape = tape.replace(/0/g, "░").replace(/1/g, "█")

  return tape.split("").join(join)
}

function positions(tape: string[] | number[]): string {
  return tape.map((v, i) => `${i}${v}`).join(" ")
}

function integerToBinaryTape(num: number, log: (...args: string[]) => void): string {
  let binary = ""

  while (binary.length < 8) {
    const quotient = Math.floor(num / 2)
    const remainder = num % 2
    const indexLabel = `${binary.length}/7`.padEnd(4)
    log(`${indexLabel} ${num} ${quotient} ${remainder} ${format([remainder])} → ${binary.length}${format([remainder])}`)
    binary = remainder + binary
    num = quotient
  }

  return binary
}

function generateRule(ruleNumber: RuleNumber, log: (...args: string[]) => void): Rule {
  log(`\nRULE ${ruleNumber}`)
  const ruleBinaryString = integerToBinaryTape(ruleNumber, log)

  log(`BINARY ${ruleBinaryString.split("").map((v, i) => `${7-i}${format(v)}`).join(" ")}`)
  // LOG(`REVERSE BINARY POSITIONS ${ruleBinaryString.split("").map((v, i) => `${i}${format(v)}`).join(" ")}`)
  log("\nRULES FROM BINARY")
  for (let i = 0; i < 8; i++) {
    log(`${format(PATTERNS[i], " ")}: ${7-i} → ${format(ruleBinaryString[i])}`)
  }

  return (left: TapeValue, center: TapeValue, right: TapeValue): TapeValue => {
    const pattern = [left, center, right].join("")
    const patternIndex = PATTERNS.indexOf(pattern)
    const next = ruleBinaryString[patternIndex]
    
    return TapeValue(next)
  }
}

export function formatTape(tape: Tape): string {
  return tape.map((v, i) => `${i}:${v}`).join(" ")
}

export function deformatTape(tape: string): Tape {
  return tape.split(" ").map(v => Number(v.split(":")[1]) as TapeValue)
}

export default function testAutomata(
  initialState: string | TapeValue[],
  ruleNumber: string | RuleNumber,
  generations: string | number = 24,
  silent = false
): string {
  if (typeof ruleNumber === "string") ruleNumber = Number(ruleNumber)
  if (typeof generations === "string") generations = Number(generations)
  if (typeof initialState === "string") {
    initialState = deformatTape(initialState)
  }

  let output = ""
  const log = (msg: string) => {
    output += msg + "\n"
    if (!silent) {
      console.log(msg)
    }
  }

  let state = initialState
  const width = initialState.length
  const states: Tape[] = [initialState]
  console.log("\n---")
  console.log(`[USER]\n${formatTape(state)}\n${ruleNumber}\n${generations}`)
  console.log("\n[ASSISTANT]")
  log(`START: MAX ${generations}`)
  log(formatTape(state))
  log(`${state.map((v, i) => `${i}:${format(`${v}`)}`).join(" ")}`)
  log(`TAPE ${positions(format(state).split(""))}`)

  const rule = generateRule(ruleNumber, log)

  function info(i: number) {
    const indexLabel = `${i-1}/${generations}`
    // const doneLabel = 
    //   i-1 === generations 
    //     ? "DONE" 
    //     : "LOOP"
    log("")
    log(`TAPE ${positions(format(state).split(""))}`)
    log(`PRINT ${indexLabel} ${format(state, " ")}`)
    // log(`${doneLabel}`)
    // log("")
    // log("LOOP")
  }

  function evolve(state: Tape) {
    const newState: Tape = []
    for (let i = 0; i < width; i++) {
      const left = i > 0 ? state[i - 1] : 0
      const center = state[i]
      const right = i < width - 1 ? state[i + 1] : 0

      const pattern: TapeValue = rule(left, center, right)
      const patternIndex = 7 - PATTERNS.indexOf([left, center, right].join(""))

      const leftLabel =
        i > 0 ? `${i - 1}${format([left])}` : `  ${format([0])}`

      const centerLabel = `${i}${format([center])}`

      const rightLabel =
        i < width - 1 ? `${i + 1}${format([right])}` : `  ${format([0])}`

      const ruleLabel = 
        `${format([left, center, right], " ")}: ${patternIndex} → ${format([pattern])}`

      // const indexLabel = i === width-1 ? "STOP" : ""
      const matchLabel = `${i}${format([pattern])}`.padStart(3)

      log(`${leftLabel.padStart(3)} ${centerLabel.padStart(3)} ${rightLabel.padStart(3)}  ${ruleLabel.padStart(4)}  ${matchLabel}`)
      newState.push(pattern)
    }

    return newState
  }

  info(1)
  for (let i = 2; i < generations + 2; i++) {
    const newState = evolve(state)

    states.push(newState)
    state = newState

    info(i)
  }

  log(states.map((state, i) => `PRINT ${`${i}/${generations}`.padEnd(5)} ${format(state, " ")}`).join("\n"))

  return output.trim()
}