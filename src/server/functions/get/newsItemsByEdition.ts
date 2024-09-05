import { MYSQL_DB } from "../../../classes/MYSQL_DB";
import { SPORTNEWS } from "../../../functions/SPORTNEWS";
import { CORE } from "../../../types/CORE";
import { DB } from "../../../types/DB";

type GetNewsItemsByEditionProps = {
    DB: MYSQL_DB,
    edition: CORE.Edition,
    lang: DB.Lang,
    targetDate: Date
}

export default async function getNewsItemsByEdition({
    DB,
    edition,
    lang,
    targetDate
}: GetNewsItemsByEditionProps ): Promise<DB.Item.JoinedNews[]> {
    const funcName = `getNewsItemsByEdition`;

    try {
        let newsItems: DB.Item.JoinedNews[] = [];
        let allAvailableNewsItems: {[key: string]: DB.Item.JoinedNews[]} = {};
        let totalAvailableNewsItems: number = 0;

        // firstly, let's see what sports are required for this edition
        const items = edition.items;
        for (let item of items){
            const sports = item.sports;
            for (let sportName of sports){
                // we're populating everything so if key exists, we skip
                if (sportName in allAvailableNewsItems) continue;

                const newsItems: DB.Item.JoinedNews[] = 
                    await SPORTNEWS.getTransItemsByLang(DB, sportName, edition.lang);
                
                // console.log(`newsItems for ${sportName}: ${newsItems.length}`);

                allAvailableNewsItems[sportName] = newsItems;
                totalAvailableNewsItems += newsItems.length;
            }

            allAvailableNewsItems.Misc = await SPORTNEWS.getTransItemsByLang(DB, 'Misc', edition.lang);
        }

        // console.log(`totalAvailableNewsItems: ${totalAvailableNewsItems}`);
        // console.log(`sports: ${Object.keys(allAvailableNewsItems).join(', ')}`);
        // console.log(`Requiered number of items: ${edition.items.length}`);
        
        // for (let sportName in allAvailableNewsItems){
        //     console.log(`available sport items for ${sportName}: ${allAvailableNewsItems[sportName].length}`);
        // }

        for (let item of items){
            for (let sportName of item.sports){
                if (!(sportName in allAvailableNewsItems)){
                    // console.warn(`No news items for ${sportName}`);
                    continue;
                };
                const nextSportItem = allAvailableNewsItems[sportName].shift();
                if (!nextSportItem) {
                    // console.warn(`We're out of items for ${sportName}`);
                    continue;
                }
                // console.log(`available sport items for ${sportName}: ${allAvailableNewsItems[sportName].length}`);
                newsItems.push(nextSportItem);
            }
        }

        if (newsItems.length !== edition.items.length && allAvailableNewsItems.Misc.length > 0){
            // console.log(`Adding Misc items`);
            for (let i = 0; i < edition.items.length - newsItems.length; i++){
                const nextMiscItem = allAvailableNewsItems.Misc.shift();
                if (!nextMiscItem) {
                    // console.warn(`We're out of items for Misc`);
                    continue;
                }
                newsItems.push(nextMiscItem);
            }
        }

        if (newsItems.length < edition.items.length) throw `Not enough news items for edition ${edition.brand_name} ${edition.product_name} ${edition.lang}\nNumber of newsItems: ${newsItems.length}, required: ${edition.items.length}`;
        // console.log(`newsItems: ${newsItems.length}`);

        return newsItems;
    } catch (e) {
        throw `${funcName}: ${e}`;
    }
}