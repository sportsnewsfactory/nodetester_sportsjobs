import { AE } from "../../types/AE";
import { Schedule } from "../../types/CORE/Schedule";
import { Template } from "../../types/CORE/Template";

export function populateScheduleElements__TESTING(
    schedule: Schedule.List[],
    scheduleElements: Template.Element.DB_Blueprint[],
    texts: AE.Json.TextImport[],
    dateFormat: string,
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
                if (j===5){
                    // console.log(`Reached event #${j}`);
                    break;
                }
                const event = eventList.entries[j];
                const numEntry = j+1;
                
                // throw JSON.stringify(event, null, 4);
                /*
                    event: 
                        {
                            "home_team_id": 370089,
                            "away_team_id": 246595,
                            "start_time_seconds": 1723338044,
                            "start_time_timestamp": "2024-08-10T22:00:44.000Z",
                            "league_season_id": 57062,
                            "home_team": "NFC",
                            "away_team": "REW",
                            "league_season_name": "Digicel Premier League  2024"
                            "slug": "nasinu-fc-rewa-fc"
                        }

                    We'll be converting slug to schedule-entry-MS-event-name
                    and start_date_timestamp to schedule-entry-MS-event-date 
                    and schedule-entry-MS-event-time
                */
                
                const eventDate = new Date(Number(event.start_time_seconds)*1000);
                // let's format date as dd MMM
                const options = { day: '2-digit', month: 'short' } as Intl.DateTimeFormatOptions;
                const date = eventDate.toLocaleDateString(dateFormat, options);
                // let's format time as HH:MM
                const time = eventDate.toLocaleTimeString(dateFormat, {hour: '2-digit', minute: '2-digit'});

                // const elementValues = {
                //     'schedule-entry-MS-event-name': event.description,
                //     // Let's show date in short format
                //     'schedule-entry-MS-event-date': date,
                //     'schedule-entry-MS-event-time': time,
                // }

                // console.log(`You are here`);

                const elementValues = {
                    'shedule-allsports-away-team': event.away_team,
                    'shedule-allsports-home-team': event.home_team,
                    'shedule-allsports-game-date': date,
                    'shedule-allsports-game-time': time,
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