import { DB } from "../../../../types/DB";

/**
 * @param sortedNewsItems must be the final sorting
 * because we're using the index to get the leagueSeasonId
 * and returning a separate array.
 */
export default function getScheduleLeagueIds(sortedNewsItems: DB.Item.JoinedNews[]): (string | null)[] {
    return sortedNewsItems.map(newsItem => !!newsItem.schedule_league_season_id 
        ? newsItem.schedule_league_season_id 
        : null
    );
}