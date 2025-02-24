import { COMMON } from "./COMMON";

export default function recognizeError(errorMessage: string): string {
    for (let errorName in COMMON) {
        const errorCommonPhrase = COMMON[errorName];
        if (errorMessage.indexOf(errorCommonPhrase) > -1) {
            return errorName;
        }
    }
    return "UNKNOWN";
}
