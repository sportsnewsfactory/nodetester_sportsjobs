import { HELPER } from '../classes/HELPER';
import { MYSQL_DB } from '../classes/MYSQL_DB';
import { DB_NAMES } from '../config/DB_NAMES';
import { DB } from '../types/DB';

/**
 * Since we have different types of news
 * we'll separate the general news items into
 * this file
 */
export const STANDINGS = {
    /**
     * Get EN and translated standings by leagueSeasonId
     * start with the standings table
     * and make inner join with CORE__TEAMS on CORE__STANDINDS.team_id === CORE__TEAMS.id
     * and another inner join with CORE__TRANS_TEAMS on team_id
     * where the name in CORE__TRANS_TEAMS will be changed to name__${lang}
     */
    async getStandingsByLang(
        DB: MYSQL_DB,
        sportName: DB.SportName,
        leagueSeasonId: string,
        lang: string
    ): Promise<DB.StandingAug[]> {
        // console.log(`getGeneralNewsItems`);
        const funcName = `NEWS.getGeneralNewsItems`;

        try {
            const rs = `${sportName}.RAPID__STANDINGS`;
            const ct = `${sportName}.CORE__TEAMS`;
            const tt = `${sportName}.CORE__TRANS_TEAMS`;
            const ls = `${sportName}.CORE__LEAGUESEASONS`;

            /*
                const sql = `
                    SELECT rs.position, rs.wins, rs.losses, rs.league_season_id, tt.name as team_name, ls.name as league_season_name
                    FROM ${rs} as rs
                    INNER JOIN ${ct} as ct
                    ON rs.team_id = ct.id
                    INNER JOIN ${tt} as tt
                    ON rs.team_id = tt.id
                    INNER JOIN ${ls} as ls
                    ON rs.league_season_id = ls.id
                    WHERE tt.lang = '${lang}'
                    AND rs.league_season_id = '${leagueSeasonId}';
                `;
            */

            /**
             * Going to use the short code for the team name
             */

            const sql = `
                SELECT rs.position, rs.wins, rs.losses, rs.league_season_id, ct.name_code as team_name, ls.name as league_season_name
                FROM ${rs} as rs
                INNER JOIN ${ct} as ct
                ON rs.team_id = ct.id
                INNER JOIN ${tt} as tt
                ON rs.team_id = tt.id
                INNER JOIN ${ls} as ls
                ON rs.league_season_id = ls.id
                WHERE tt.lang = '${lang}'
                AND rs.league_season_id = '${leagueSeasonId}';
            `;

            // console.log(`sql: ${sql}`);

            const itemsResult = await DB.pool.execute(sql);
            const items = itemsResult[0] as DB.StandingAug[];
            items.sort((a, b) => Number(a.position) - Number(b.position));
            return items;
        } catch (e) {
            throw `${funcName} failed with: ${e}`;
        }
    },
    async getStandingsEN(
        DB: MYSQL_DB,
        sportName: DB.SportName,
        leagueSeasonId: string,
    ): Promise<DB.StandingAug[]> {
        // console.log(`getStandingsEN`);
        const funcName = `NEWS.getStandingsEN`;

        try {
            const rs = `${sportName}.RAPID__STANDINGS`;
            const ct = `${sportName}.CORE__TEAMS`;
            const ls = `${sportName}.CORE__LEAGUESEASONS`;

            const sql = `
                SELECT rs.position, rs.wins, rs.losses, rs.league_season_id, ct.name_code as team_name, ls.name as league_season_name
                FROM ${rs} as rs
                INNER JOIN ${ct} as ct
                ON rs.team_id = ct.id
                INNER JOIN ${ls} as ls
                ON rs.league_season_id = ls.id
                AND rs.league_season_id = '${leagueSeasonId}';
            `;

            // console.log(`sql: ${sql}`);

            const itemsResult = await DB.pool.execute(sql);
            const items = itemsResult[0] as DB.StandingAug[];
            items.sort((a, b) => Number(a.position) - Number(b.position));
            return items;
        } catch (e) {
            throw `${funcName} failed with: ${e}`;
        }
    },
};
