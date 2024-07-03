import { MYSQL_DB } from "../classes/MYSQL_DB";
import { DB } from "../types/DB";
import { Motorsport } from "../types/Motorsport";

export const MOTORSPORT_STANDINGS = {
    async getStandingsEN(
        DB: MYSQL_DB,
        leagueSeasonId: string,
    ): Promise<Motorsport.Standings.List>{
        // console.log(`getStandingsEN`);
        const funcName = `getStandingsEN`;
        const sportName: DB.SportName = 'Motorsport';

        try {
            const rs = `${sportName}.RAPID__STANDINGS`;
            const ct = `${sportName}.CORE__TEAMS`;
            const ls = `${sportName}.CORE__LEAGUESEASONS`;

            const sql = `
                SELECT rs.position, rs.points, rs.league_season_id, ct.name as team_name, ls.name as league_season_name
                FROM ${rs} as rs
                INNER JOIN ${ct} as ct
                ON rs.team_id = ct.id
                INNER JOIN ${ls} as ls
                ON rs.league_season_id = ls.id
                AND rs.league_season_id = '${leagueSeasonId}'
                ORDER BY rs.position
                LIMIT 10;
            `;

            // console.warn(`sql: ${sql}`);

            const itemsResult = await DB.pool.execute(sql);
            const entries = itemsResult[0] as Motorsport.Standings.Entry[];
            // entries.sort((a, b) => Number(a.position) - Number(b.position));

            /**
             * Let's try and find the league_season_name
             */
            let leagueSeasonName = '';
            try {
                for (let entry of entries){
                    if (entry.league_season_name){
                        leagueSeasonName = entry.league_season_name;
                        break;
                    }
                }
            } catch (e) {
                console.warn(`Could not find league_season_name: ${e} leagueSeasonId: ${leagueSeasonId}`)
            }
        
            let list: Motorsport.Standings.List = {
                entries
            }

            if (leagueSeasonName.length > 0) list.header = leagueSeasonName;

            return list
        } catch (e) {
            throw `${funcName} failed with: ${e}`;
        }
    },
};