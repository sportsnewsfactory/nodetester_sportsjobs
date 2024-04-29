/**
 * Here we'll cope with the ETIMEDOUT error
 */
type ActionWithRetry<T> = () => Promise<T>;

export async function runFunctionWithRetry<T>(
    action: ActionWithRetry<T>,
    maxRetries: number
): Promise<T> {
    let retryCount = 0;

    async function retryAction(): Promise<T> {
        try {
            return await action(); // Invoke the action function and wait for its completion
        } catch (error: unknown) {
            const hasEtimedout =
                (typeof error === 'string' &&
                    error.indexOf('ETIMEDOUT') > -1) ||
                (error instanceof Error &&
                    error.message.indexOf('ETIMEDOUT') > -1);

            if (hasEtimedout) {
                console.log(`%cETIMEDOUT error, let's retry`, 'color: orange');
                if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`Retry attempt ${retryCount}`);
                    // Delay between retries (e.g., 3 seconds)
                    await new Promise((resolve) => setTimeout(resolve, 3000));
                    return await retryAction(); // Recursively call retryAction after the delay
                } else {
                    const errorMessage = `Action failed after ${retryCount} retries:\n${error}`;
                    console.warn(errorMessage);
                    throw errorMessage;
                    // Handle the failure scenario or rethrow the error
                }
            } else {
                throw `Error is not ETIMEDOUT, so not retrying: ${error}`;
            }
        }
    }

    return await retryAction();
}
