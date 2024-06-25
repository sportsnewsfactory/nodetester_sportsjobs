import { AE } from "../../../types/AE";
import { Template } from "../../../types/CORE/Template";
import fs from 'fs';

export function processElement(
    element: Template.Element.DB_Blueprint,
    element_subtype: string | null,
    eActions: Template.Element.Action[],
    layerCompName: string,
    // source data
    RAW_DATA: any,

    // destination data
    texts: AE.Json.TextImport[],
    files: AE.Json.FileImport[],
    trimSyncData: AE.Json.TS.Sequence,
){
    for (let action of eActions){
        try {
            switch (action.action_type){
                case 'insertFile': {
                    // locate filePath
                    if (element.element_name in RAW_DATA){
                        const data = RAW_DATA[element.element_name as keyof typeof RAW_DATA];
                        if (
                            element_subtype 
                            && element_subtype in data
                        ){
                            const filePath = data[element_subtype as keyof typeof data];
                            if (!fs.existsSync(filePath))
                                throw `File path does not exist: ${filePath}`;

                            const method = action.method as AE.Method.Resize;

                            files.push({
                                absolutePath: filePath,
                                compositionName: layerCompName,
                                resizeAction: method,
                            });
                        } else {
                            /**
                             * We regard @param RAW_DATA[element.element_name]
                             * as a file path and not as an object
                             */
                        }
                    }
                    break;
                }
                case 'insertText': {
                    // locate text source
                    break;
                }
                case 'trim': {
                    const layerOrCompName: string = layerCompName;
                    
                    const trim: AE.Json.TS.Trim = {
                        method: action.method as AE.Method.Trim,
                        layerOrCompName: layerOrCompName,
                    };
                    trimSyncData.push(trim);
                    break;
                }
                case 'sync': {
                    break;
                }
                case 'marker': {
                    break;
                }
                default: throw `Action type not recognized: ${action.action_type}`;
            }
        }
        catch (e) {
            throw `Error in processing element ${element.element_name}: ${e}`;
        }
    }
}