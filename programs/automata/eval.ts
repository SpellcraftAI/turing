export type TapeValue = 0 | 1;
export type Tape = TapeValue[];

function format(tape: TapeValue[]): string {
  return tape.join('').replace(/0/g, '░').replace(/1/g, '█');
}

function positions(tape: TapeValue[]): string {
  const values = format(tape).split('')
  return values.map((v, i) => `${i}${v}`).join(' ')
}

const applyRule110 = (
  left: TapeValue,
  center: TapeValue,
  right: TapeValue
): TapeValue => {
  const pattern = [left, center, right].join("");
  return ["111", "100", "000", "00"].includes(pattern) ? 0 : 1;
};

export default function rule_110(
  initialState: string | TapeValue[],
  width: string | number = 28,
  generations: string | number = 24
): string {
  if (typeof width === "string") width = parseInt(width);
  if (typeof generations === "string") generations = parseInt(generations);
  if (typeof initialState === "string") {
    initialState = initialState.split(" ").map(Number) as TapeValue[];
  }

  let output = "";
  const log = (msg: string) => {
    console.log(msg);
    output += msg + '\n';
  }

  let state = initialState;
  const states: Tape[] = [initialState]

  function info(i: number) {
    log(`TAPE ${state.join(" ")}`)
    log(`SYMBOL ${positions(state)}`)
    log(`LIST ${format(state).split("").join(" ")} ${i}`)
  }

  function evolve(state: Tape) {
    const newState: Tape = [];
    if (typeof width === "string") width = parseInt(width);
    for (let i = 0; i < width; i++) {
      const left = i > 0 ? state[i - 1] : 0;
      const center = state[i];
      const right = i < width - 1 ? state[i + 1] : 0;

      const pattern: TapeValue = applyRule110(left, center, right);
      log(`${i-1}${format([left])} ${i}${format([center])} ${i+1}${format([right])} ${pattern}`)
      newState.push(pattern);
    }

    return newState;
  }

  console.log(`\nUSER:\n${state.join(" ")}\n${width}\n${generations}`)
  console.log("\nASSISTANT:")
  info(1)
  for (let i = 2; i < generations + 2; i++) {
    const newState = evolve(state);

    states.push(newState);
    state = newState;

    info(i)
  }

  log("RETURN")
  log(states.map((state, i) => `${format(state)} ${i+1}`).join("\n"))

  return output.trim();
}