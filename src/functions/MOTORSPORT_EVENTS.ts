import { MYSQL_DB } from '../classes/MYSQL_DB';
import { DB } from '../types/DB';
import { Motorsport } from '../types/Motorsport';

export const MOTORSPORT_EVENTS = {
    async getByLeagueSeasonId(
        DB: MYSQL_DB,
        leagueSeasonId: string,
    ): Promise<Motorsport.Schedule.List> {
        // console.log(`getGeneralNewsItems`);
        const funcName = `MOTORSPORT_EVENTS.getByLeagueSeasonId`;
        const sportName: DB.SportName = 'Motorsport';

        try {
            const re = `${sportName}.RAPID__EVENTS`;
            const ls = `${sportName}.CORE__LEAGUESEASONS`;

            const sql = `
                SELECT 
                re.start_date_seconds, 
                re.start_date_timestamp, 
                re.league_season_id, 
                re.slug,
                re.description,
                ls.name as league_season_name
                FROM ${re} as re
                INNER JOIN ${ls} as ls
                ON re.league_season_id = ls.id
                WHERE re.league_season_id = '${leagueSeasonId}'
                AND re.start_date_seconds > UNIX_TIMESTAMP()
                ORDER BY re.start_date_seconds
                LIMIT 5;
            `;

            // console.warn(`sql: ${sql}`);

            const itemsResult = await DB.pool.execute(sql);
            const events = itemsResult[0] as Motorsport.Schedule.Event[];

            const list: Motorsport.Schedule.List = {
                // header: 'Events',
                // sub_header: events[0].league_season_name,
                events
            }

            // items.sort((a, b) => Number(a.start_time_seconds) - Number(b.start_time_seconds));
            
            return list;
        } catch (e) {
            throw `${funcName} failed with: ${e}`;
        }
    }
};
