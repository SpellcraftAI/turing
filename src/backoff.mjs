export async function backoff(action, maxRetries = 6, initialDelay = 15) {
  let retries = 0;
  let delay = initialDelay;

  while (retries < maxRetries) {
    try {
      const results = await action();
      return results;
    } catch (e) {
      retries++;

      if (retries === maxRetries) {
        throw new Error('Max retries exceeded.');
      }

      console.error(e.message);
      console.error(`Error. Retrying in ${delay}s. [Attempt ${retries}/${maxRetries}]`);

      await new Promise(resolve => setTimeout(resolve, 1000 * delay));
      delay *= 2;
    }
  }
}