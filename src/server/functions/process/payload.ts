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
        dbg: {
            dbgLevel,
            saveExportClose: {
                isSave: false,
                isExport: false,
                isClose: false,
            },
        },
    };

    for (let text of payload.texts) {
        text.text = typeof text.text === 'string' ? text.text : String(text.text);
        text.text = cleanText(text.text, allowedChars);
    }

    
    const jsoned = JSON.stringify(payload).replace(/\\\\/g, '/');
    // const jsoned = cleanJSON(payload);
    // console.warn(jsoned);

    // return;

    const axiosResponse = await axios.post(
        `http://localhost:${PORT}${API_Endpoint}`,
        { stringifiedJSON: jsoned }
    );

    return axiosResponse;
}

// const cleanJSON = (payload: any) => {
//     // Convert the payload to a JSON string
//     let jsonString = JSON.stringify(payload);

//     // Remove any non-printable characters
//     // jsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g, '');

//     // Remove any characters that are not English letters, numbers, spaces, slashes, single quotes, double quotes, underscores, hyphens, commas, or dots
//     // Keep the structure of JSON intact by avoiding changes to structural characters: {}, [], :, , 
//     // jsonString = jsonString.replace(/[^a-zA-Z0-9\s\/'".,_-{}[\]:,]/g, '');

//     // Define the set of allowed characters
//     const allowedChars: Set<string> = new Set(
//         'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,:"{}[]\'_-'
//     );
//     allowedChars.add('\\').add('/')
    
//     // Use Array.from and filter to keep only allowed characters
//     const cleanedJson: string = Array.from(jsonString)
//         .filter(char => allowedChars.has(char))
//         .join('')
//         .replace(/\\\\/g, '\\\\');
    
//     return cleanedJson;

//     // Handle any double backslashes if necessary
//     jsonString = jsonString.replace(/\\\\/g, '\\\\'); // Replacing double backslashes with a single backslash

//     return jsonString;
// };
