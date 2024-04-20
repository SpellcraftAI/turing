export type TapeValue = 0 | 1;
export type Tape = TapeValue[];

export type Rule = (left: TapeValue, center: TapeValue, right: TapeValue) => TapeValue;
export type RuleNumber = number;

const PATTERNS: string[] = ['111', '110', '101', '100', '011', '010', '001', '000'];

let OUTPUT = "";
const LOG = (msg: string) => {
  console.log(msg);
  OUTPUT += msg + '\n';
}

const TapeValue = (value: any): TapeValue => value as TapeValue;

function format(tape: string | number[]) {
  if (Array.isArray(tape)) tape = tape.join("");
  return tape.replace(/0/g, '░').replace(/1/g, '█');
}

function positions(tape: string[] | number[]): string {
  return tape.map((v, i) => `${i}${v}`).join(' ')
}

function integerToBinaryTape(num: number): string {
  let binary = '';

  while (binary.length < 8) {
    const quotient = Math.floor(num / 2);
    const remainder = num % 2;
    LOG(`${binary.length}/7: ${num} ${quotient} ${remainder} ${format([remainder])} → ${binary.length}${format([remainder])}`);
    binary = remainder + binary;
    num = quotient;
  }

  return binary;
}

function generateRule(ruleNumber: RuleNumber): Rule {
  LOG(`RULE ${ruleNumber}`);
  const ruleBinaryString = integerToBinaryTape(ruleNumber);

  LOG(`BINARY ${ruleBinaryString.split("").map((v, i) => `${7-i}${format(v)}`).join(" ")}`)
  // LOG(`REVERSE BINARY POSITIONS ${ruleBinaryString.split("").map((v, i) => `${i}${format(v)}`).join(" ")}`)
  LOG("RULES FROM BINARY")
  for (let i = 0; i < 8; i++) {
    LOG(`${7-i} ${format(PATTERNS[i])} → ${format(ruleBinaryString[i])}`);
  }

  // LOG(`IN ${positions(PATTERNS.map(format))}`)
  // LOG(`OUT ${positions(format(ruleBinaryString).split(''))}`)
  // const ruleBinaryString = ruleNumber.toString(2).padStart(8, '0');

  
  return (left: TapeValue, center: TapeValue, right: TapeValue): TapeValue => {
    const pattern = [left, center, right].join('');
    const patternIndex = PATTERNS.indexOf(pattern);
    const next = ruleBinaryString[patternIndex];
    
    return TapeValue(next);
  };
}

export default function testAutomata(
  initialState: string | TapeValue[],
  ruleNumber: string | RuleNumber,
  generations: string | number = 24
): string {
  if (typeof ruleNumber === "string") ruleNumber = Number(ruleNumber);
  if (typeof generations === "string") generations = Number(generations);
  if (typeof initialState === "string") {
    initialState = initialState.trim().split("").map(Number) as TapeValue[];
  }

  let state = initialState;
  const width = initialState.length;
  const states: Tape[] = [initialState]

  console.log(`\nUSER:\n${state.join("")}\n${ruleNumber}\n${width}\n${generations}`)
  console.log("\nASSISTANT:")
  LOG(`START`)
  LOG(`${state.join("")}`)
  LOG(`${state.map((v, i) => `${i}:${v}`).join(" ")}`)
  LOG(`${state.map((v, i) => `${i}:${format(`${v}`)}`).join(" ")}`)
  // LOG(`INPUT ${format(state).split("").join(" ")}`)
  LOG(`TAPE ${positions(format(state).split(""))}`)
  LOG(`MAX ${generations}`)

  const rule = generateRule(ruleNumber);

  function info(i: number) {
    // LOG(`TAPE ${state.join(" ")}`)
    // LOG(`TAPE ${positions(format(state).split(""))}`)
    // LOG(`PRINT ${format(state).split("").join(" ")} ${i-1}`)
    LOG(`TAPE ${i-1}/${generations} ${positions(format(state).split(""))}`)
    // LOG(`MAX ${generations}`)
    // LOG("PRINT")
    // LOG(states.map((state, i) => `${format(state)} ${i+1}`).join("\n"))
  }

  function evolve(state: Tape) {
    const newState: Tape = [];
    for (let i = 0; i < width; i++) {
      const left = i > 0 ? state[i - 1] : 0;
      const center = state[i];
      const right = i < width - 1 ? state[i + 1] : 0;

      const pattern: TapeValue = rule(left, center, right);
      const patternIndex = PATTERNS.indexOf([left, center, right].join(''));

      const leftLabel =
        `${i - 1}${format([left])}`

      const centerLabel = `${i}${format([center])}`;

      const rightLabel =
        `${i + 1}${format([right])}`;

      const ruleLabel = 
        `${format([left, center, right])} → ${format([pattern])}`

      LOG(`${leftLabel.padStart(3)} ${centerLabel.padStart(3)} ${rightLabel.padStart(3)} ${ruleLabel.padStart(2)}`)
      newState.push(pattern);
    }

    return newState;
  }

  info(1)
  for (let i = 2; i < generations + 2; i++) {
    const newState = evolve(state);

    states.push(newState);
    state = newState;

    info(i)
  }

  LOG("DONE")
  LOG(states.map((state, i) => `${`${i}/${generations}`.padEnd(5)} ${format(state).split("").join(" ")}`).join("\n"))

  return OUTPUT.trim();
}