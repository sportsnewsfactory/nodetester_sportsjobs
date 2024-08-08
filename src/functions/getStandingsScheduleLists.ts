import { MYSQL_DB } from "../classes/MYSQL_DB";
import { Schedule } from "../types/CORE/Schedule";
import { Standings } from "../types/CORE/Standings";
import { DB } from "../types/DB";
import { NEXTMATCHES } from "./NEXTMATCHES";
import { STANDINGS } from "./STANDINGS";

export async function getStandingsScheduleLists(
    SportsDB: MYSQL_DB,
    newsItems: DB.Item.JoinedNews[],
): Promise<{standingsLists: Standings.List[], scheduleLists: Schedule.List[]}> {
    
    let standingsLeagueSeasonIds: (string | null)[] = [];
    let scheduleLeagueSeasonIds: (string | null)[] = [];
    for (let i=0; i<newsItems.length; i++){
        if (!!newsItems[i].show_standings){
            standingsLeagueSeasonIds.push(newsItems[i].standings_league_season_id);
        }
        if (!!newsItems[i].show_next_matches){
            scheduleLeagueSeasonIds.push(newsItems[i].schedule_league_season_id);
        }
    }

    // console.log(`leagueSeasonsIds: ${JSON.stringify(leagueSeasonsIds, null, 4)}`);
    // return;

    let standingsLists: Standings.List[] = [];
    let scheduleLists: Schedule.List[] = [];

    for (let i=0; i<newsItems.length; i++){
        const newsItem: DB.Item.JoinedNews = newsItems[i];

        if (standingsLeagueSeasonIds[i] === null){
            standingsLists.push({entries: [], header: ''});
        } else {
            const itemStandings: Standings.Entry[] = await STANDINGS.getStandingsEN(SportsDB, newsItem.sport_name, standingsLeagueSeasonIds[i] as string);
            if (itemStandings.length === 0){
                standingsLists.push({entries: [], header: ''});
            } else {
                // console.log(`itemStandings[0].league_name: ${itemStandings[0].league_name}`);
                standingsLists.push({entries: itemStandings, header: itemStandings[0].league_season_name});
            }
        }

        if (scheduleLeagueSeasonIds[i] === null){
            scheduleLists.push({entries: [], header: ''});
        } else {
            const schedule: DB.NextMatch_NewFormat[] = await NEXTMATCHES.getBySportNameAndLeagueSeasonId(SportsDB, newsItem.sport_name, scheduleLeagueSeasonIds[i] as string);
            if (schedule.length === 0){
                scheduleLists.push({entries: [], header: ''});
            } else {
                scheduleLists.push({entries: schedule, header: schedule[0].league_season_id});
            }
        }
    }
    return {
        standingsLists,
        scheduleLists
    }
}