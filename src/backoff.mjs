
export async function backoff(runBatch, maxRetries, initialDelay) {
  let retries = 0;
  let delay = initialDelay;

  while (retries < maxRetries) {
    try {
      const results = await runBatch();
      return results;
    } catch (e) {
      retries++;
      console.log(`Batch failed. Retrying in ${delay}ms. Retry attempt: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  throw new Error('Max retries exceeded. Batch execution failed.');
}