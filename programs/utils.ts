export function format(tape: string | number[], join = "") {
  if (Array.isArray(tape)) tape = tape.join("")
  tape = tape.replace(/0/g, "░").replace(/1/g, "█")

  return tape.split("").join(join)
}

export function positions(tape: string[] | number[]): string {
  return tape.map((v, i) => `${i}${v}`).join(" ")
}

export function integerToBinaryTape(
  num: number, 
  log: (...args: string[]) => void
): string {
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