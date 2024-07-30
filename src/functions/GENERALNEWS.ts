import { HELPER } from '../classes/HELPER';
import { MYSQL_DB } from '../classes/MYSQL_DB';
import { formatDateToSQLTimestamp } from '../classes/formatDateToSQLTimestamp';
import { DB_NAMES, TABLE_NAMES } from '../config/DB_NAMES';
import { DB } from '../types/DB';
import { MYSQL } from '../types/MYSQL';

/**
 * Since we have different types of news
 * we'll separate the general news items into
 * this file
 */
export const GENERALNEWS = {
    /**
     * Get news items with inner join to translated table
     *
     * We're going to be selecting the items from the RAPID__NEWS table
     * without the original English headline, sub_headline, narration
     * but instead we'll be selecting the translated versions
     *
     * So the resulting items will also be of type DB.Item.GeneralNews
     */
    async getTransItemsByLang(
        DB: MYSQL_DB,
        lang: string
    ): Promise<DB.Item.JoinedNews[]> {
        // console.log(`getGeneralNewsItems`);
        const funcName = `NEWS.getGeneralNewsItems`;

        try {
            const sql = `
                SELECT rn.id, tr.file_name, tr.headline, tr.sub_headline, tr.narration, rn.sport_id, sports.name as sport_name, rn.background, rn.logo, rn.show_standings, rn.show_next_matches, rn.standings_league_season_id, rn.schedule_league_season_id, tr.lang
                FROM GeneralNews.RAPID__NEWS as rn
                INNER JOIN GeneralNews.RAPID__TRANS_NEWS as tr
                ON rn.id = tr.item_id
                INNER JOIN config.sports as sports
                ON rn.sport_id = sports.id
                WHERE tr.lang = '${lang}';          
            `;

            const itemsResult = await DB.pool.execute(sql);
            const items = itemsResult[0] as DB.Item.JoinedNews[];
            const sortedSliced = items
                .sort((a, b) => Number(a.id) - Number(b.id))
                .slice(0, 5);

            const expectedNumberOfNewsItems = 5;
            if (sortedSliced.length !== expectedNumberOfNewsItems) throw `Wrong number of newsItems: ${sortedSliced.length}`;

            return sortedSliced;
        } catch (e) {
            throw `${funcName} failed with: ${e}`;
        }
    },
};

export const SPORTNEWS = {
    async getTransItemsByLang(
        DB: MYSQL_DB,
        sportName: DB.SportName,
        lang: string
    ): Promise<DB.Item.JoinedNews[]> {
        // console.log(`getGeneralNewsItems`);
        const funcName = `SPORTNEWS.getTransItemsByLang`;
        const expectedNumberOfNewsItems = 5;

        try {
            const sql = `
                SELECT rn.id, tr.file_name, tr.headline, tr.sub_headline, tr.narration, rn.background, rn.logo, rn.show_standings, rn.show_next_matches, rn.standings_league_season_id, rn.schedule_league_season_id, tr.lang
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

            if (sortedSliced.length !== expectedNumberOfNewsItems) throw `Wrong number of newsItems: ${sortedSliced.length}`;

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
        const funcName = `NEWS.getTransItemsByLangAndSport`;

        let sports = await DB.SELECT<DB.Sport>(TABLE_NAMES.config.sports)
        let filteredSports = sports
            .filter(sport => 
                sport.name !== 'General' as DB.SportName
                && sport.name !== 'Mixed' as DB.SportName
                && sport.name !== 'Soccer' as DB.SportName
                && sport.name !== 'Motorsport' as DB.SportName
            );
        
        const items = {} as {[key in DB.SportName]: DB.Item.JoinedNews[]};

        for (const sport of filteredSports){
            try {
                const sql = `
                    SELECT rn.id, tr.file_name, tr.headline, tr.sub_headline, tr.narration, rn.background, rn.logo, rn.show_standings, rn.show_next_matches, rn.standings_league_season_id, rn.schedule_league_season_id, tr.lang
                    FROM ${sport.name}.RAPID__NEWS as rn
                    INNER JOIN ${sport.name}.RAPID__TRANS_NEWS as tr
                    ON rn.id = tr.item_id
                    WHERE tr.lang = '${lang}' AND rn.when_created > DATE_SUB(NOW(), INTERVAL 1 DAY);       
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
                throw `${funcName} failed with: ${e}`;
            }
        }
        return items;
    },
    encryptText: (text: string): string => {
        return text
            .replace(/"/g, '__D_QUOTE__')
            .replace(/'/g, "__QUOTE__");
    }
}


