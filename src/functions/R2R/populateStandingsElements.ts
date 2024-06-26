import { AE } from "../../types/AE";
import { Template } from "../../types/CORE/Template";
import { Motorsport } from "../../types/Motorsport";

export function populateStandingsElements(
    standings: Motorsport.Standings.List[],
    standingsElements: Template.Element.DB_Blueprint[],
    texts: AE.Json.TextImport[],
){
    const funcName = 'populateStnadingsElements';

    const hardCodedHeaderElement: Template.Element.DB_Blueprint = {
        label_color: 'Red',
        container_type: 'layer',
        element_name: 'header',
        naming_scheme: 'Ranking-header-$num_item',
        element_type: 'text',
        variables: '$num_item',
        description: 'Header for standings',
    };
    try {
        const elementNames = standingsElements.map(
            (element) => element.element_name
        );
        
        for (let i=0; i<standings.length; i++){
            const numItem = i+1;
            const standingsItem: Motorsport.Standings.List = standings[i];
            
            const header = standingsItem.header || 'HEADER';
            const textLayerName = hardCodedHeaderElement.naming_scheme
                .replace('$num_item', String(numItem));

            const text: AE.Json.TextImport = {
                text: header,
                textLayerName,
                recursiveInsertion: true,
            };

            // console.warn(`pushing header text: ${JSON.stringify(text)}`);

            texts.push(text);

            for (let entry of standingsItem.entries){
                /*
                    entry: 
                        position: string;
                        team_name: string;
                        points: string;
                        league_season_name: string;
                        league_season_id: string;

                    the two we'll be dealing with:
                        - team_name
                        - points
                    
                    scheme: ranking-stat$num_prop-team$num_item-$num_entry
                    example: ranking-stat1-team1-1
                */
                
                for (let key in entry){
                    if (!elementNames.includes(key)) continue;
                    
                    // console.log(`key: ${key}`);
                    
                    const value = entry[key as keyof Motorsport.Standings.Entry];
                    const element = standingsElements.find(
                        (element) => element.element_name === key
                    );
                    if (!element) throw `Element blueprint not found for ${key}`;

                    const textLayerName = element.naming_scheme
                        .replace('$num_item', String(numItem))
                        .replace('$num_entry', String(entry.position))
                    
                    // console.warn(`textLayerName: ${textLayerName} value: ${value}`);

                    // const eActions = elementActions.filter(
                    //     (action) => action.element_name === element.element_name
                    // );

                    // // the only action we'll be dealing with is insertText
                    // for (let action of eActions){
                    //     if (action.action_type !== 'insertText') throw `Action type not supported in standings: ${action.action_type}`;
                    // for now hardcoding the action
                    const text: AE.Json.TextImport = {
                        text: value,
                        textLayerName,
                        recursiveInsertion: false,
                    };
                    // console.warn(`pushing standings texts`);
                    texts.push(text);
                // }
                }
            }
        }
    } catch (e) {
        throw `${funcName}: ${e}`
    }
}