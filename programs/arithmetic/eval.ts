import { fromPositional, toPositional } from "../utils"

function toDigitArray(n: number | string): number[] {
  if (typeof n === "string") {
    return fromPositional(n).split("").map(Number)
  } else {
    return n.toString().split("").map(Number)
  }
}

export default function multiply(a: number | string, b: number | string): string {
  // Convert inputs to digit arrays, reversed for easier manipulation
  const digitsA = toDigitArray(a)
  const digitsB = toDigitArray(b)
  const A = Number(digitsA.join(""))
  const B = Number(digitsB.join(""))

  const logs: string[] = []
  const output: number[] = new Array(digitsA.length + digitsB.length).fill(0)

  logs.push("START")
  logs.push(`A ${toPositional(A)} ${A}`)
  logs.push(`B ${toPositional(B)} ${B}`)
  logs.push(`${A} * ${B}`)
  digitsA.reverse()
  digitsB.reverse()

  logs.push("JOIN")
  let joinedIndex = 0
  logs.push("A:")
  for (let i = 0; i < digitsA.length; i++) {
    logs.push(`${i} ${joinedIndex}`)
    joinedIndex++
  }

  logs.push("B:")
  for (let i = 0; i < digitsB.length; i++) {
    logs.push(`${i} ${joinedIndex}`)
    joinedIndex++
  }

  // Perform the multiplication
  for (let i = 0; i < digitsB.length; i++) {
    logs.push(`OUTPUT ${toPositional(output.join(""), "O")}`)
    for (let j = 0; j < digitsA.length; j++) {
      const digitA = digitsA[j]
      const digitB = digitsB[i]
      const product = digitA * digitB
      const position = i + j

      logs.push(`B:${i}/${digitsB.length-1} A:${j}/${digitsA.length-1}`)
      logs.push(`${i} + ${j} = ${position}`)
      logs.push(`${i}:${digitB} * ${j}:${digitA} = ${product}`)

      const current = output[position]
      const next = output[position] + product
      logs.push(`${position}:${current} + ${product} = O${position}:${next}`)
      
      output[position] = next

      // Handle carry over
      let k = position
      if (output[k] >= 10) {
        logs.push("CARRY")
      
        while (output[k] >= 10) {
          const head = output[k]
          const next = output[k + 1]
  
          logs.push(`O${k}:${head} O${k + 1}:${next}`)
          const tens = Math.floor(output[k] / 10)
          const remainder = output[k] % 10
          logs.push(`O${k}:${head} ${tens} ${remainder}`)
          logs.push(`O${k + 1}:${next} + ${tens} = O${next + tens}`)
  
          output[k + 1] += tens
          output[k] = remainder
          logs.push(`SET O${k}:${remainder}`)
          logs.push(`O${k}:${output[k]} O${k + 1}:${output[k + 1]}`)
          k++
        }

        logs.push("DONE")
      }
    }
  }

  // Trim leading zeros from the output array
  while (output.length > 1 && output[output.length - 1] === 0) {
    output.pop()
  }

  const result = output.slice().reverse().join("")

  logs.push(`RETURN ${result}`)
  logs.push(`REFERENCE ${A * B}`)

  return logs.join("\n")
}