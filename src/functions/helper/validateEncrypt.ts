import fs from 'fs';
import { PS } from '../../types/PS';

export function validateEncrypt(data: PS.DataObj): PS.DataObj {
    try {
        // check if template path exist
        if (!fs.existsSync(data.paths.template)){
            throw `Template path not found: ${data.paths.template}`;
        }
        if (!fs.existsSync(data.paths.exportFolder)) throw `exportFolder path not found: ${data.paths.exportFolder}`;
        if (!fs.existsSync(data.paths.saveFolder)) throw `saveFolder path not found: ${data.paths.saveFolder}`;

        // check if images exist
        // for (const image of data.images){
        //     if (!fs.existsSync(image.sourcePath)){
        //         throw `Image not found: ${image.sourcePath}`;
        //     }
        // }

        for (const text of data.texts) {
            text.content = encryptQuotes_PSEXTLEGACY(text.content);
        }

        return data;
    } catch (e) {
        throw `Error in validateEncrypt: ${e}\n\nData: ${JSON.stringify(data, null, 2)}`;
    }
}

function encryptQuotes_PSEXTLEGACY(str: string){
    return str.replace(/"/g, '***dquote***').replace(/'/g, '***squote***');
}