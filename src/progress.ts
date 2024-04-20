export function* tqdm<T>(iterable: Iterable<T>): Generator<T, void, unknown> {
  const items = Array.from(iterable)
  const total = items.length
  let completed = 0
  const startTime = Date.now()

  const updateProgress = () => {
    const progress = completed / total
    const elapsedTime = (Date.now() - startTime) / 1000 // In seconds
    const estimatedTotalTime = elapsedTime / progress
    const timeRemaining = estimatedTotalTime - elapsedTime

    const barLength = 60
    const filledLength = Math.round(barLength * progress)
    const bar = "█".repeat(filledLength) + "-".repeat(barLength - filledLength)

    process.stdout.write(`\r[${bar}] ${(progress * 100).toFixed(2)}% | ETA: ${formatTime(timeRemaining)}`)

    if (completed === total) {
      process.stdout.write("\n")
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  for (const item of items) {
    yield item
    completed++
    updateProgress()
  }
}