import { HELPER } from '../classes/HELPER';
import { MYSQL_DB } from '../classes/MYSQL_DB';
import { formatDateToSQLTimestamp } from '../classes/formatDateToSQLTimestamp';
import { DB_NAMES, TABLE_NAMES } from '../config/DB_NAMES';
import { DB } from '../types/DB';
import { MYSQL } from '../types/MYSQL';

export const SPORTNEWS = {
    async getTransItemsByLang(
        DB: MYSQL_DB,
        sportName: DB.SportName,
        lang: string,
        expectedNumberOfNewsItems: number = 5,
    ): Promise<DB.Item.JoinedNews[]> {
        // console.log(`getGeneralNewsItems`);
        const funcName = `SPORTNEWS.getTransItemsByLang`;

        try {
            const sql = `
                SELECT 
                    rn.id, 
                    tr.file_name, 
                    tr.headline,
                    tr.sub_headline,
                    tr.narration,
                    rn.background,
                    rn.logo,
                    tr.lang,
                    rn.show_standings,
                    rn.show_next_matches,
                    rn.standings_league_season_id,
                    rn.schedule_league_season_id
                FROM ${sportName}.RAPID__NEWS as rn
                INNER JOIN ${sportName}.RAPID__TRANS_NEWS as tr
                ON rn.id = tr.item_id
                WHERE tr.lang = '${lang}';          
            `;

            const itemsResult = await DB.pool.execute(sql);
            const items = itemsResult[0] as DB.Item.JoinedNews[];
            const sortedSliced = items
                .map(item => {
                    return {
                        ...item,
                        headline: this.encryptText(item.headline),
                        sub_headline: this.encryptText(item.sub_headline),
                        sport_name: sportName
                    };
                })
                .sort((a, b) => Number(a.id) - Number(b.id))
                .slice(0, expectedNumberOfNewsItems);
            
            // throw `firstsorted: ${JSON.stringify(sortedSliced[0], null, 4)}`;

            // if (sortedSliced.length !== expectedNumberOfNewsItems) throw `Wrong number of newsItems: ${sortedSliced.length}`;

            return sortedSliced;
        } catch (e) {
            throw `${funcName} failed with: ${e}`;
        }
    },
    async getTransItemsByLangAndSport(
        DB: MYSQL_DB,
        lang: string
    ): Promise<{[key in DB.SportName]: DB.Item.JoinedNews[]}> {
        // console.log(`getGeneralNewsItems`);
        const funcName = `SPORTNEWS.getTransItemsByLangAndSport`;

        let sports = await DB.SELECT<DB.Sport>(TABLE_NAMES.config.sports)
        let filteredSports = sports
            .filter(sport => 
                sport.name !== 'General' as DB.SportName
                && sport.name !== 'Mixed' as DB.SportName
                && sport.name !== 'Soccer' as DB.SportName
                && sport.name !== 'Motorsport' as DB.SportName
                // && sport.name !== 'Misc' as DB.SportName
            );
        
        let items = {} as {[key in DB.SportName]: DB.Item.JoinedNews[]};

        for (const sport of filteredSports){
            try {
                const sql = `
                    SELECT 
                        rn.id, 
                        tr.file_name, 
                        tr.headline,
                        tr.sub_headline,
                        tr.narration,
                        rn.background,
                        rn.logo,
                        tr.lang,
                        rn.show_standings,
                        rn.show_next_matches,
                        rn.standings_league_season_id,
                        rn.schedule_league_season_id
                    FROM ${sport.name}.RAPID__NEWS as rn
                    INNER JOIN ${sport.name}.RAPID__TRANS_NEWS as tr
                    ON rn.id = tr.item_id
                    WHERE tr.lang = '${lang}' 
                    AND rn.when_created > DATE_SUB(NOW(), INTERVAL 1 DAY);       
                `;

                const itemsResult = await DB.pool.execute(sql);
                const withSportName = (itemsResult[0] as DB.Item.JoinedNews[]).map(item => {
                    return {
                        ...item,
                        headline: this.encryptText(item.headline),
                        sub_headline: this.encryptText(item.sub_headline),
                        sport_name: sport.name
                    };
                });
                
                items[sport.name] = withSportName;
            } catch (e) {
                throw `${funcName} sport: ${sport.name} failed with: ${e}`;
            }
        }

        // now let's do Misc
        const sql = `
            SELECT 
                rn.id, 
                tr.file_name, 
                tr.headline,
                tr.sub_headline,
                tr.narration,
                rn.background,
                rn.logo,
                tr.lang
            FROM Misc.RAPID__NEWS as rn
            INNER JOIN Misc.RAPID__TRANS_NEWS as tr
            ON rn.id = tr.item_id
            WHERE tr.lang = '${lang}' 
            AND rn.when_created > DATE_SUB(NOW(), INTERVAL 1 DAY);       
        `;

        const itemsResult = await DB.pool.execute(sql);
        const withSportName = (itemsResult[0] as DB.Item.JoinedNews[]).map(item => {
            return {
                ...item,
                headline: this.encryptText(item.headline),
                sub_headline: this.encryptText(item.sub_headline),
                sport_name: 'Misc'
            };
        });
                
        items['Misc'] = withSportName as DB.Item.JoinedNews[];

        return items;
    },
    encryptText: (text: string): string => {
        return text
            .replace(/"/g, '__D_QUOTE__')
            .replace(/'/g, "__QUOTE__");
    }
}


