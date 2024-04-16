export type Test = {
  input: string
}

export type Config = {
  temperature?: number
  max_tokens?: number
  models: Record<string, string>
}