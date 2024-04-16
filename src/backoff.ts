export async function backoff<T extends () => any | Promise<any>>(
  action: T, 
  maxRetries = 6, 
  initialDelay = 15
) {
  let retries = 0;
  let delay = initialDelay;

  while (true) {
    try {
      const results = await action();
      return results;
    } catch (e: any) {
      retries++;
      if (e?.message) console.error(e.message);

      if (retries <= maxRetries) {
        console.error(`Error. Retrying in ${delay}s. [Attempt ${retries}/${maxRetries}]`);
        await new Promise(resolve => setTimeout(resolve, 1000 * delay));
        delay *= 2;
      } else {
        throw new Error('Max retries exceeded.');
      }
    }
  }
}