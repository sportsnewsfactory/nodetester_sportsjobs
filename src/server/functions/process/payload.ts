import axios, { AxiosResponse } from "axios";
import { PATHS } from "../../../functions/PATHS";
import { cleanText } from "../../../functions/R2R/process/cleanText";
import { AE } from "../../../types/AE";
import { CORE } from "../../../types/CORE";

export async function processPayloadWithDBG(
    files: AE.Json.FileImport[],
    texts: AE.Json.TextImport[],
    trimSyncData: AE.Json.TS.Sequence,
    subFolders: { [key in CORE.Keys.AE.ProductSubFolder]: string },
    edition: CORE.Edition,
    PORT: number,
    API_Endpoint: string,
    allowedChars: string,
    dbgLevel: number = -7,
): Promise<AxiosResponse<any, any>> {
    let payload: AE.Json.Payload = {
        files,
        texts,
        trimSyncData,
        names: {
            exportComp: '0_Main comp',
            importBin: 'Imports',
        },
        paths: PATHS.getAll__CORE(subFolders, edition),
        // dbg: {
        dbgLevel,
            // saveExportClose: {
            //     isSave: dbgLevel > -7,
            //     isExport: dbgLevel > -7,
            //     isClose: dbgLevel > -7,
            // },
        // },
        aeRenderTamplates: [],
    };

    for (let text of payload.texts) {
        text.text = typeof text.text === 'string' ? text.text : String(text.text);
        text.text = cleanText(text.text, allowedChars);
    }

    const jsoned = JSON.stringify(payload).replace(/\\\\/g, '/');

    const URL = `http://localhost:${PORT}${API_Endpoint}`;

    // console.log(`%cURL: ${URL}`, 'color: pink');

    const axiosResponse = await axios.post(URL, { stringifiedJSON: jsoned });

    return axiosResponse;
}