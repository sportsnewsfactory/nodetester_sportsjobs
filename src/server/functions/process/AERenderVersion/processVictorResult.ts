import { ERRORS, STATUS, VictorError } from './STATUS';

export type VictorResult = {
    status: 'error' | 'success';
    statusCode: number;
    errorType?: VictorError;
    message?: string;
    assetName?: string;
};

export function processVictorResult(victorResult: any): VictorResult {
    const funcName = 'processVictorResult';
    try {
        if (victorResult && 'result' in victorResult) {
            if (victorResult.result === STATUS.success) {
                return {
                    status: 'success',
                    statusCode: 200,
                };
            }
        }

        /**
         * It's not a success, so we need to find out what went wrong.
         */
        const stringifiedResponse = JSON.stringify(victorResult);

        return processVictorError(stringifiedResponse);
    } catch (e) {
        throw `${funcName}: ${e}`;
    }
}

export function processVictorError(
    stringifiedErrorMessage: string
): VictorResult {
    const funcName = 'processVictorError';
    try {
        for (let n in ERRORS) {
            const errorType = n as VictorError;
            if (stringifiedErrorMessage.includes(errorType)) {
                return {
                    status: 'error',
                    statusCode: 700, // We'll use status code 700 for recognized Victor errors
                    errorType,
                    message: ERRORS[errorType],
                };
            }
        }

        /**
         * If we've reached this point, we don't know what went wrong.
         */
        return {
            status: 'error',
            statusCode: 500,
            message: stringifiedErrorMessage,
        };
    } catch (e) {
        throw `${funcName}: ${e}`;
    }
}
