import { VictorResult } from "../process/AERenderVersion/processVictorResult";
import { COMMON } from "./COMMON";

export default function recognizeErrorV2(victorResult: VictorResult): string {
    if (victorResult.statusCode === 200) return 'success';

    if (victorResult.message && victorResult.message.length > 0){
        for (let errorName in COMMON) {
            const errorCommonPhrase = COMMON[errorName];
            if (victorResult.message.indexOf(errorCommonPhrase) > -1) {
                return errorName;
            }
        }
    }

    return "UNKNOWN";
}
