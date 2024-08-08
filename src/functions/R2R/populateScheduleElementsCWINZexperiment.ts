import { AE } from "../../types/AE";
import { Schedule } from "../../types/CORE/Schedule";
import { Template } from "../../types/CORE/Template";
import { Motorsport } from "../../types/Motorsport";

export function populateScheduleElements__TESTING(
    schedule: Schedule.List[],
    scheduleElements: Template.Element.DB_Blueprint[],
    texts: AE.Json.TextImport[],
){
    const now = new Date();
    const thisYear = now.getFullYear();

    const funcName = 'populateScheduleElements__TESTING';
    try {
        const elementNames = scheduleElements.map(
            (element) => element.element_name
        );
        
        for (let i=0; i<schedule.length; i++){
            const numItem = i+1;
            const eventList: Schedule.List = schedule[i];
            
            // we'll currently ignore header
            // and sub_header
            for (let j=0; j<eventList.entries.length; j++){
                const event = eventList.entries[j];
                const numEntry = j+1;
                
                // throw JSON.stringify(event, null, 4);
                /*
                    event: 
                        slug: string;
                        league_season_name: string;
                        league_season_id: string;
                        start_date_seconds: number;
                        start_date_timestamp: string;

                    We'll be converting slug to schedule-entry-MS-event-name
                    and start_date_timestamp to schedule-entry-MS-event-date 
                    and schedule-entry-MS-event-time
                */
                
                const eventDate = new Date(Number(event.start_date_seconds)*1000);
                // let's format date as dd MMM
                const options = { day: '2-digit', month: 'short' } as Intl.DateTimeFormatOptions;
                const date = eventDate.toLocaleDateString('en-US', options);
                // let's format time as HH:MM
                const time = eventDate.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});

                const elementValues = {
                    'schedule-entry-MS-event-name': event.description,
                    // Let's show date in short format
                    'schedule-entry-MS-event-date': date,
                    'schedule-entry-MS-event-time': time,
                }

                for (let key in elementValues){
                    if (!elementNames.includes(key)) throw `Element blueprint not found for ${key}`;
                    
                    // console.log(`key: ${key}`);
                    
                    //@ts-ignore
                    const value = elementValues[key].replace(` ${thisYear}`,'');
                    const element = scheduleElements.find(
                        (element) => element.element_name === key
                    );
                    if (!element) throw `Element blueprint not found for ${key}`;

                    const textLayerName = element.naming_scheme
                        .replace('$num_item', String(numItem))
                        .replace('$num_entry', String(numEntry))  
                    
                    // console.warn(`textLayerName: ${textLayerName} value: ${value}`);
                    
                    // const eActions = elementActions.filter(
                    //     (action) => action.element_name === element.element_name
                    // );

                    // the only action we'll be dealing with is insertText
                    
                    // for (let action of eActions){
                    //     if (action.action_type !== 'insertText') throw `Action type not supported in standings: ${action.action_type}`;
                    // for now hardcoding the action
                    const text: AE.Json.TextImport = {
                        text: value,
                        textLayerName,
                        recursiveInsertion: true,
                    };
                    // console.warn(`pushing event texts`);
                    texts.push(text);
                }
                // throw 'stop';
                // }
            }

        }
    } catch (e) {
        throw `${funcName}: ${e}`
    }
}