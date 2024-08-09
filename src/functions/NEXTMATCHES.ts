import { MYSQL_DB } from '../classes/MYSQL_DB';
import { DB } from '../types/DB';

export const NEXTMATCHES = {
    async getBySportNameAndLeagueSeasonId(
        DB: MYSQL_DB,
        sportName: DB.SportName,
        leagueSeasonId: string,
        // lang: string
    ): Promise<DB.NextMatch_NewFormat[]> {
        // console.log(`getGeneralNewsItems`);
        const funcName = `NEWS.getGeneralNewsItems`;

        try {
            const rn = `${sportName}.RAPID__NEXTMATCHES`;
            const ct = `${sportName}.CORE__TEAMS`;
            const ls = `${sportName}.CORE__LEAGUESEASONS`;

            const sql = `
                SELECT rn.home_team_id, rn.away_team_id, rn.start_time_seconds, rn.start_time_timestamp, rn.league_season_id, 
                    ct_home.name_code as home_team, ct_away.name_code as away_team, ls.name as league_season_name, rn.slug
                FROM ${rn} as rn
                INNER JOIN ${ct} as ct_home
                ON rn.home_team_id = ct_home.id
                INNER JOIN ${ct} as ct_away
                ON rn.away_team_id = ct_away.id
                INNER JOIN ${ls} as ls
                ON rn.league_season_id = ls.id
                WHERE rn.league_season_id = '${leagueSeasonId}';
            `;

            const itemsResult = await DB.pool.execute(sql);
            const items = itemsResult[0] as DB.NextMatch_NewFormat[];
            items.sort((a, b) => Number(a.start_time_seconds) - Number(b.start_time_seconds));
            return items;
        } catch (e) {
            throw `${funcName} failed with: ${e}`;
        }
    }
};
