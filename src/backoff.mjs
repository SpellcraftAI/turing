export async function backoff(action, maxRetries = 6, initialDelay = 15) {
  let retries = 0;
  let delay = initialDelay;

  while (true) {
    try {
      const results = await action();
      return results;
    } catch (e) {
      retries++;
      console.error(e.message);
      console.error(`Error. Retrying in ${delay}s. [Attempt ${retries}/${maxRetries}]`);

      if (retries === maxRetries) {
        throw new Error('Max retries exceeded.');
      }

      await new Promise(resolve => setTimeout(resolve, 1000 * delay));
      delay *= 2;
    }
  }
}