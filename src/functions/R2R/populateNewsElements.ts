import { AE } from "../../types/AE";
import { Template } from "../../types/CORE/Template";
import { DB } from "../../types/DB";
import fs from 'fs';

/**
 * There are 5 news items
 * each containing 5 elements
 * if an element is a text layer, we take the content from the news item
 * if an element is a file, we take the file name from the news item
 * and couple it with the corresponding folder from @param generalFolderPaths
 */
export function populateNewsElements(
    newsItems: DB.Item.JoinedNews[],
    generalFolderPaths: {[key in 'dynamic_backgrounds' | 'narration' | 'logos']: string},
    newsItemsElements: Template.Element.DB_Blueprint[],
    elementActions: Template.Element.Action[],
    texts: AE.Json.TextImport[],
    files: AE.Json.FileImport[],
    trimSyncData: AE.Json.TS.Sequence,
    targetDate: Date,
){
    const funcName = 'populateNewsElements';
    try {
        const elementNames = newsItemsElements.map(
            (element) => element.element_name
        );
        /*
            NewsBase:
                id: string;
                headline: string;
                sub_headline: string;
                narration: string;
                when_created: string;

            News = NewsBase &:
                background: string;
                logo: string;
                sport_name?: SportName;

            JoinedNews = News &:
                show_standings: string;
                show_next_matches: string;
                standings_league_season_id: string | null;
                schedule_league_season_id: string | null;
                sport_id: string;
                sport_name: SportName;
                file_name: string;

            Right now for testing purposes,
            we'll just populate the NewsBase and News props.
        */
        for (let i=0; i<newsItems.length; i++){
            const numItem = i+1;
            const newsItem = newsItems[i];
            for (let key in newsItem){
                if (!elementNames.includes(key)) continue;
                // in the case of the narration we need the file name
                const value = key === 'narration' 
                    ? newsItem.file_name 
                    : newsItem[key as keyof typeof newsItem];

                /**
                 * So now we have the keys: background, headline, logo, narration, sub_headline
                 * and their corresponding values
                 * 
                 * if it's a text we just need the value
                 * if it's a file we need to couple the value with the corresponding folder:
                 *      - background: dynamic_backgrounds
                 *      - logo: logos
                 *      - narration: narration
                 * 
                 * if we have $item_specific_sport_name in the folder path 
                 * we need to replace it with the sport name
                 */

                const elementBluePrint = newsItemsElements.find(
                    (element) => element.element_name === key
                );

                if (!elementBluePrint) throw `Element blueprint not found for ${key}`;

                const eActions = elementActions.filter(
                    (action) => action.element_name === elementBluePrint.element_name
                );

                const layerCompName: string = elementBluePrint.naming_scheme
                    // .replace('$sub_type', element_subtype || '') in news items there are no subtypes
                    .replace('$item_type', 'news-item')
                    .replace('$num_item', String(numItem));

                for (let action of eActions){
                    switch (action.action_type){
                        case 'insertFile': {
                            switch (key){
                                case 'background': {
                                    const folderPath = generalFolderPaths.dynamic_backgrounds;
                                    const folderPathWithSportName = folderPath.replace(
                                        '$item_specific_sport_name',
                                        newsItem.sport_name
                                    );
                                    const filePath = `${folderPathWithSportName}/${value}`;
                                    if (!fs.existsSync(filePath))
                                        throw `File path does not exist: ${filePath}`;

                                    const method = action.method as AE.Method.Resize;

                                    files.push({
                                        absolutePath: filePath,
                                        compositionName: layerCompName,
                                        resizeAction: method,
                                    });
                                    break;
                                }
                                case 'logo': {
                                    const folderPath = generalFolderPaths.logos;
                                    const folderPathWithSportName = folderPath.replace(
                                        '$item_specific_sport_name',
                                        newsItem.sport_name
                                    );
                                    const filePath = `${folderPathWithSportName}/${value}`;
                                    if (!fs.existsSync(filePath))
                                        throw `File path does not exist: ${filePath}`;

                                    const method = action.method as AE.Method.Resize;

                                    files.push({
                                        absolutePath: filePath,
                                        compositionName: layerCompName,
                                        resizeAction: method,
                                    });
                                    break;
                                }
                                case 'narration': {
                                    // let targetDate = new Date();
                                    // if (targetDate.getHours() > 20) {
                                    //     // If it's past 8pm, targetDate becomes tomorrow
                                    //     targetDate.setDate(targetDate.getDate() + 1);
                                    // }
                                    const dateFolderName = targetDate.toLocaleDateString('en-CA'); // Format: YYYY-MM-DD
                                    // console.warn(`Target date: ${targetDate}\ndateFolderName: ${dateFolderName}`);
                                    //@ts-ignore
                                    const folderPath = `${generalFolderPaths.narration}${newsItem.sport_name}/${newsItem.lang}/${dateFolderName}`;
                                    const filePath = `${folderPath}/${value}`;
                                    if (!fs.existsSync(filePath))
                                        throw `File path does not exist: ${filePath}`;

                                    const method = action.method as AE.Method.Resize;

                                    files.push({
                                        absolutePath: filePath,
                                        compositionName: layerCompName,
                                        resizeAction: method,
                                    });
                                    break;
                                }
                                default: throw `Key not recognized: ${key} in item #${numItem}`;
                            }
                            break;
                        }
                        case 'insertText': {
                            if (value === null) throw `Text value is null in item #${numItem} key: ${key}`;
                            const text: AE.Json.TextImport = {
                                text: value,
                                textLayerName: layerCompName,
                                recursiveInsertion: true, // default
                            };
                            texts.push(text);
                            break;
                        }
                        case 'trim': {                            
                            const trim: AE.Json.TS.Trim = {
                                method: action.method as AE.Method.Trim,
                                layerOrCompName: layerCompName,
                            };
                            trimSyncData.push(trim);
                            break;
                        }
                        case 'sync': {
                            throw 'Sync action not supposed to be here';
                            break;
                        }
                        case 'marker': {
                            throw 'Marker action not supposed to be here';
                            break;
                        }
                        default: throw `Action not recognized: ${action.action_type}`;
                    }
                }
            }
        }
    } catch (e) {
        throw `${funcName}: ${e}`
    }
}

/*
    generalFolderPaths: {
            "dynamic_backgrounds": "G:/My Drive/Sports/S_Studio/S_S_Backgrounds/S_S_Backgrounds_$item_specific_sport_name",
            "narration": "G:/My Drive/Sports/S_Studio/S_S_Narration/S_S_N_",
            "logos": "G:/My Drive/Sports/S_Studio/S_S_Logos/S_B_$item_specific_sport_name"
        }

    newsItemElements: [
        {
            "element_name": "background",
            "element_type": "footageFile",
            "container_type": "comp",
            "naming_scheme": "$item_type$num_item-background",
            "label_color": "Blue",
            "variables": "$item_type, $num_item",
        },
        {
            "element_name": "headline",
            "element_type": "text",
            "container_type": "layer",
            "naming_scheme": "$item_type$num_item-headline",
            "label_color": null,
            "variables": "$item_type, $num_item",
        },
        {
            "element_name": "logo",
            "element_type": "footageFile",
            "container_type": "comp",
            "naming_scheme": "$item_type$num_item-logo",
            "label_color": "Blue",
            "variables": "$item_type, $num_item",
        },
        {
            "element_name": "narration",
            "element_type": "audioFile",
            "container_type": "comp",
            "naming_scheme": "$item_type$num_item-narration",
            "label_color": "Green",
            "variables": "$item_type, $num_item",
        },
        {
            "element_name": "sub_headline",
            "element_type": "text",
            "container_type": "layer",
            "naming_scheme": "$item_type$num_item-sub_headline",
            "label_color": null,
            "variables": "$item_type, $num_item",
        }
    ]

    first news item example:
    {
        "id": 1,
        "file_name": "MXHI1.wav",
        "headline": "Everton deducted two points",
        "sub_headline": "Second breach of Premier League financial rules",
        "narration": "Everton have been deducted two points for a second breach of Premier League financial rules. Rules permit clubs to lose £105m over three years and an independent commission found Everton breached that by £16.6m for the three-year period",
        "sport_id": 1,
        "sport_name": "Football",
        "background": "football-or-soccer-2022-01-03-23-15-53-utc.mp4",
        "logo": "Serie A Italy/name_code/ASR.png",
        "show_standings": 0,
        "show_next_matches": 0,
        "standings_league_season_id": 52186,
        "schedule_league_season_id": null,
        "lang": "HI"
    }
*/