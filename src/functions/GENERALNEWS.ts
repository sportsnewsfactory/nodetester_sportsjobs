import { HELPER } from '../classes/HELPER';
import { MYSQL_DB } from '../classes/MYSQL_DB';
import { formatDateToSQLTimestamp } from '../classes/formatDateToSQLTimestamp';
import { DB_NAMES } from '../config/DB_NAMES';
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
                SELECT rn.id, tr.file_name, tr.headline, tr.sub_headline, tr.narration, rn.sport_id, sports.name as sport_name, rn.background, rn.logo, rn.show_standings, rn.standings_league_season_id, rn.schedule_league_season_id, tr.lang
                FROM GeneralNews.RAPID__NEWS as rn
                INNER JOIN GeneralNews.RAPID__TRANS_NEWS as tr
                ON rn.id = tr.item_id
                INNER JOIN config.sports as sports
                ON rn.sport_id = sports.id
                WHERE tr.lang = '${lang}';          
            `;

            const itemsResult = await DB.pool.execute(sql);
            const items = itemsResult[0] as DB.Item.JoinedNews[];
            return items
                .sort((a, b) => Number(a.id) - Number(b.id))
                .slice(0, 5);
        } catch (e) {
            throw `${funcName} failed with: ${e}`;
        }
    },
    // async getUITransItems(DB: MYSQL_DB): Promise<UI.Trans.Item.Base[]> {
    //     const funcName = `NEWS.getUITransItems`;
    //     try {
    //         const sql = `
    //         SELECT GeneralNews.RAPID__NEWS.*, config.sports.name AS sport_name
    //         FROM GeneralNews.RAPID__NEWS
    //         JOIN config.sports
    //         ON GeneralNews.RAPID__NEWS.sport_id = config.sports.id;
    //     `;
    //         const items = await DB.pool.execute(sql);
    //         return items[0] as UI.Trans.Item.Base[];
    //     } catch (e) {
    //         throw `${funcName} failed with: ${e}`;
    //     }
    // },
    // async getGeneralTransNewsItems(DB: MYSQL_DB): Promise<DB.Item.TransNews[]> {
    //     const funcName = `NEWS.getGeneralTransNewsItems`;
    //     const items: DB.Item.TransNews[] =
    //         await HELPER.select<DB.Item.TransNews>({
    //             DB,
    //             funcName,
    //             tableName: `GeneralNews.RAPID__TRANS_NEWS`,
    //         });
    //     return items;
    // },
};
