import { Stat, standingsEntryDefs } from "../../constants/standingsEntryKeys";
import { AE } from "../../types/AE";
import { Standings } from "../../types/CORE/Standings";
import { Template } from "../../types/CORE/Template";

/**
 * Standings objects are sorted by position
 */
export function populateStandingsElements(
    standingsLists: Standings.List[],
    standingsElements: Template.Element.DB_Blueprint[],
    texts: AE.Json.TextImport[],
){
    const funcName = 'populateStnadingsElements';
    const now = new Date();
    const thisYear = now.getFullYear();
    const allPossibleStats = standingsEntryDefs
        .filter((stat) => stat.key !== 'position' && stat.key !== 'team_name')
        .sort((a, b) => a.hirarchy - b.hirarchy);

    // console.log(`allPossibleStats: ${JSON.stringify(allPossibleStats, null, 4)}`);
    // return;

    try {
        const teamNameElement: Template.Element.DB_Blueprint | undefined = standingsElements.find(
            (element) => element.element_name === 'standings-allsports-team_name'
        );
        if (!teamNameElement) throw `Team name element not found`;
        
        const statElement: Template.Element.DB_Blueprint | undefined = standingsElements.find(
            (element) => element.element_name === 'standings-allsports-stat'
        );
        if (!statElement) throw `Stat element not found`;
        
        const statTitleElement: Template.Element.DB_Blueprint | undefined = standingsElements.find(
            (element) => element.element_name === 'standings-allsports-stat-title'
        );
        if (!statTitleElement) throw `Stat element not found`;

        for (let i=0; i<standingsLists.length; i++){
            const numItem = i+1;
            const standingsList: Standings.List = standingsLists[i];
            if (standingsList.entries.length === 0) continue;

            const populateHeaderText = () => {
                const hardCodedHeaderElement: Template.Element.DB_Blueprint = {
                    label_color: 'Red',
                    container_type: 'layer',
                    element_name: 'standings-allsports-cluster-header', //'header',
                    naming_scheme: 'standings-cluster$num_item-header', // standings-cluster1-header
                    element_type: 'text',
                    variables: '$num_item',
                    description: 'Header for standings',
                };
                
                const header = (standingsList.header || '').replace(` ${thisYear}`,'');
                const textLayerName = hardCodedHeaderElement.naming_scheme
                    .replace('$num_item', String(numItem));

                const text: AE.Json.TextImport = {
                    text: header,
                    textLayerName,
                    recursiveInsertion: true,
                };

                // console.log(`%cvalue: ${header}, textLayerName: ${textLayerName}`, 'color: pink');

                texts.push(text);
            }

            populateHeaderText();

            const entries = standingsList.entries.sort(
                (a, b) => Number(a.position) - Number(b.position)
            );

            // console.log(`%centries: ${JSON.stringify(entries, null, 4)}`, 'color: cyan');
            // return;

            const populateStatTitleRowText = () => {
                const firstEntry: Standings.Entry = entries[0];
                const entryStatTitles = Object.keys(firstEntry);

                let statCounter = 1;
                let hirarchyCounter = 0;

                let nextStat: Stat | null = getNextStatByHirarchy(
                    allPossibleStats, entryStatTitles, hirarchyCounter
                );

                if (nextStat === null) throw `nextStat is null for entry ${1}`;

                while(nextStat !== null){
                    
                    // console.log(`NextStat: ${JSON.stringify(nextStat)}`);
                    
                    const populateStatTitle = (stat: Stat) => {
                        // probably a number
                        const value = stat.shortName;

                        const textLayerName = statTitleElement.naming_scheme
                            .replace('$num_item', String(numItem))
                            .replace('$num_entry', String(1))
                            .replace('$num_stat', String(statCounter));

                        // console.log(`%cvalue: ${value}, textLayerName: ${textLayerName}`, 'color: cyan')
                        // throw 'stop';

                        const text: AE.Json.TextImport = {
                            text: value,
                            textLayerName,
                            recursiveInsertion: false,
                        };

                        texts.push(text);
                    }
                    
                    populateStatTitle(nextStat);

                    statCounter++; // always increments by 1
                    hirarchyCounter = nextStat.hirarchy; // always increments to the next hirarchy

                    nextStat = getNextStatByHirarchy(
                        allPossibleStats, entryStatTitles, hirarchyCounter
                    );
                }
            }

            populateStatTitleRowText();

            for (let e=0; e<entries.length; e++){
                if (e === 10) {
                    // console.warn(`Found 9th entry`);
                    break;
                }
                const entry = entries[e];
                
                // console.log(`%centry: ${JSON.stringify(entry, null, 4)}`,'color: orange');
                // return;

                const numEntry = e+1;
                let statCounter = 1;
                let hirarchyCounter = 0;

                if (Number(entry.position) !== numEntry) 
                    throw `Position mismatch @ list: ${numItem} entry #${numEntry}: position ${entry.position} !== ${numEntry}`;

                /**
                 * let's get the key with the lowest hirarchy
                 * in order to populate @param $num_stat #1 etc
                 * if the entries are football entries, for example,
                 * so the stats are wins, losses, draws, which have
                 * a hirarchy of 2, 3, 4 respectively.
                 * So the first @param $num_stat is 2, the second is 3 etc.
                 */
                const entryStatTitles = Object.keys(entry);

                const populateTeamName = () => {
                    // Firstly, let's verify that the team_name is present
                    if (!entryStatTitles.includes('team_name')) 
                        throw `team_name not found in entry ${e}`;

                    // populate the team name
                    const textLayerName = teamNameElement.naming_scheme
                        .replace('$num_item', String(numItem))
                        .replace('$num_entry', String(numEntry));

                    const text: AE.Json.TextImport = {
                        text: entry.team_name,
                        textLayerName,
                        recursiveInsertion: false,
                    };

                    // console.log(`%cvalue: ${entry.team_name}, textLayerName: ${textLayerName}`, 'color: orange');

                    texts.push(text);
                }

                populateTeamName();
                
                let nextStat: Stat | null = getNextStatByHirarchy(
                    allPossibleStats, entryStatTitles, hirarchyCounter
                );

                if (nextStat === null) throw `nextStat is null for entry ${e}`;

                while(nextStat !== null){
                    
                    // console.log(`NextStat: ${JSON.stringify(nextStat)}`);

                    const populateStat = (stat: Stat) => {
                        // probably a number
                        const value = entry[stat.key];

                        const textLayerName = statElement.naming_scheme
                            .replace('$num_item', String(numItem))
                            .replace('$num_entry', String(numEntry))
                            .replace('$num_stat', String(statCounter));

                        // console.log(`%cvalue: ${value}, textLayerName: ${textLayerName}`, 'color: cyan')
                        
                        const text: AE.Json.TextImport = {
                            text: value,
                            textLayerName,
                            recursiveInsertion: false,
                        };

                        texts.push(text);
                    }
                    
                    populateStat(nextStat);

                    statCounter++; // always increments by 1
                    hirarchyCounter = nextStat.hirarchy; // always increments to the next hirarchy

                    nextStat = getNextStatByHirarchy(
                        allPossibleStats, entryStatTitles, hirarchyCounter
                    );

                    // if (nextStat === null){
                    //     console.warn(`nextStat is null for entry ${e}`);
                    // }
                }

                // throw `%cWe're done with entry ${e}`;
                // return;
            }

            // console.log(`%cWe're done with list ${numItem}`, 'color: green');
        }
    } catch (e) {
        throw `${funcName}: ${e}`
    }
}


/**
 * Retrieves the next stat from the given array of all 
 * possible stats based on the hierarchy counter.
 * 
 * @param allPossibleStats - An array of all possible stats.
 * @param entryStatTitles - An array of entry stat titles.
 * @param currentHirarchyCounter - The current hierarchy counter.
 * @returns The next @type {Stat} stat from the array that matches the conditions, 
 * or null if no match is found.
 */
function getNextStatByHirarchy(
    allPossibleStats: Stat[],
    entryStatTitles: string[],
    currentHirarchyCounter: number,
){
    for (let stat of allPossibleStats){
        // console.warn(`stat: ${JSON.stringify(stat, null, 4)}`);
        
        if (entryStatTitles.includes(stat.key) && stat.hirarchy > currentHirarchyCounter){
            // console.log(`%centryStatTitles: ${entryStatTitles.join()}, currentHirarchy: ${currentHirarchyCounter}`, 'color: cyan');
            // console.log(`%cReturning stat: ${JSON.stringify(stat, null, 4)}`, 'color: green');
            // return null;
            return stat;
        }
    }
    return null;
}