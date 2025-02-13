import axios, { AxiosResponse } from 'axios';
import { AE } from '../../../../types/AE';
import {
    VictorResult,
    processVictorResult,
    processVictorError,
} from './processVictorResult';

export async function processPayloadWithVictorResult(
    files: AE.Json.FileImport[],
    texts: AE.Json.TextImport[],
    trimSyncData: AE.Json.TS.Sequence,
    PORT: number,
    API_Endpoint: string,
    // allowedChars: string,
    dbgLevel: number = -7,
    paths: AE.Json.AbsolutePath.Obj,
    importBin: string, // = 'Imports',
    exportComp: string, // = '0_Main comp',
    aeRenderSeq: AE.RenderTemplate[]
): Promise<VictorResult> {
    try {
        let payload: AE.Json.Payload = {
            files,
            texts,
            trimSyncData,
            names: {
                exportComp,
                importBin,
            },
            paths,
            dbgLevel,
            aeRenderSeq,
        };

        for (let text of payload.texts) {
            text.text =
                typeof text.text === 'string' ? text.text : String(text.text);
            // text.text = cleanText(text.text, allowedChars);
        }

        const jsoned = JSON.stringify(payload).replace(/\\\\/g, '/');

        const axiosResponse: AxiosResponse<any, any> = await axios.post(
            `http://localhost:${PORT}${API_Endpoint}`,
            { stringifiedJSON: jsoned }
        );

        return processVictorResult(axiosResponse.data);
    } catch (e) {
        return processVictorError(`${e}`);
    }
}
