import axios, { AxiosResponse } from "axios";
import { AE } from "../../../types/AE";
import { CORE } from "../../../types/CORE";
import { PATHS } from "../../PATHS";

export async function processPayload(
    files: AE.Json.FileImport[],
    texts: AE.Json.TextImport[],
    trimSyncData: AE.Json.TS.Sequence,
    subFolders: { [key in CORE.Keys.AE.ProductSubFolder]: string },
    edition: CORE.Edition,
    PORT: number,
    API_Endpoint: string,
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
        dbg: {
            dbgLevel: -7,
            saveExportClose: {
                isSave: false,
                isExport: false,
                isClose: false,
            },
        },
    };

    for (let text of payload.texts) {
        text.text = typeof text.text === 'string' ? text.text : String(text.text);
        // Use convertedText here
    }

    const jsoned = JSON.stringify(payload).replace(/\\\\/g, '/');
    // console.warn(jsoned);

    // return;

    const axiosResponse = await axios.post(
        `http://localhost:${PORT}${API_Endpoint}`,
        { stringifiedJSON: jsoned }
    );

    return axiosResponse;
}