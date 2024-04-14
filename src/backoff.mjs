
export async function backoff(action, maxRetries = 10, initialDelay = 10) {
  let retries = 0;
  let delay = initialDelay;

  while (retries < maxRetries) {
    try {
      const results = await action();
      return results;
    } catch (e) {
      retries++;
      console.error(e);
      console.error(`Batch failed. Retrying in ${delay}s. [Attempt ${retries}/${maxRetries}]`);
      await new Promise(resolve => setTimeout(resolve, 1000 * delay));
      delay *= 2;
    }
  }

  throw new Error('Max retries exceeded. Batch execution failed.');
}