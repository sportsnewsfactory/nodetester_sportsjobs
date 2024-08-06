import { AE } from "../../../types/AE";
import { Template } from "../../../types/CORE/Template";
import { DailyPresenterScheme } from "../../Presenters";
import fs from 'fs';

/**
 * We start with processing the smallest building blocks @param elements
 * and build up from there... @param clusters, @param templateMainLayers.
 * We need to start only with the elements that are of types:
 * 'footageFile' | 'text' | 'audioFile' as inserting files and texts 
 * is the first step
 */
export function processTemplateElements(
    templateElements: Template.Record.Element[],
    elementBluePrints: Template.Element.DB_Blueprint[],
    elementActions: Template.Element.Action[],
    templateName: string,
    // texts: AE.Json.TextImport[] = [];
    files: AE.Json.FileImport[],
    trimSyncData: AE.Json.TS.Sequence,
    RAW_DATA: {presenter: DailyPresenterScheme},
){
    // let stage01_elements: Template.Element.Realized[] = [];
    for (const templateElement of templateElements){
        
        const elementBluePrint: Template.Element.DB_Blueprint | undefined = elementBluePrints.find(e => e.element_name === templateElement.element_name);
        if (!elementBluePrint) throw `Element blueprint not found for element ${templateElement.element_name} in template ${templateName}`;

        if (elementBluePrint.element_type === 'preexisting') continue;
        /**
         * Now we have the blueprint.
         * We need to resolve the naming scheme and variables
         * example of the only template level element that answers
         * to this category is the 'presenter' elements
         * element_type: 'footageFile'
         * naming_scheme: presenter-$sub_type
         * variables: $sub_type ('open' | 'close')
         */
        
        let layerCompName: string = elementBluePrint.naming_scheme
            .replace('$sub_type', templateElement.element_subtype || '');

        /**
         * There are two actions for files
         * but despite having the order written down
         * in the DB, the AE extension will deal with it.
         */
        let eActions: Template.Element.Action[] = elementActions.filter(action => action.element_name === templateElement.element_name);

        /**
         * Let's try getting the files now
         * We know that the element presenter is a footageFile
         */
        for (let action of eActions){
            switch (action.action_type){
                case 'insertFile': {
                    // locate filePath
                    if (templateElement.element_name in RAW_DATA){
                        const data = RAW_DATA[templateElement.element_name as keyof typeof RAW_DATA];
                        if (
                            templateElement.element_subtype 
                            && templateElement.element_subtype in data
                        ){
                            const filePath = data[templateElement.element_subtype as keyof typeof data];
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
                             * We regard @param RAW_DATA[templateElement.element_name]
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
    }
}