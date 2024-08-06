import { DB } from "../types/DB";

/**
 * We need a selection mechanism.
 * If there is 1 of each sport we take the first item of each.
 * So the mechanism is to grab the first item of each and then,
 * if we haven't reached 5 items, we grab the second item of each
 * and so on.
 */
export async function selectMixedNews(
    allNewsItems: {[key in DB.SportName]: DB.Item.JoinedNews[]}
): Promise<DB.Item.JoinedNews[]> {
    try {
        let mixedNewsItems: DB.Item.JoinedNews[] = [];
        let i = 0;
        let keys = Object.keys(allNewsItems) as DB.SportName[];
        
        /**
         * Because we're running a while loop
         * let's first make sure that there are at least 5 items
         * in all of the arrays together.
         */
        const totalItems: number = keys.reduce((acc, key) => acc + allNewsItems[key].length, 0);
        if (totalItems < 5) throw `Not enough news items to mix. Total items: ${totalItems}`;

        while (mixedNewsItems.length < 5){
            let key = keys[i];
            let newsItems = allNewsItems[key];
            if (newsItems.length > 0){
                mixedNewsItems.push(newsItems.shift() as DB.Item.JoinedNews);
            }
            i++;
            if (i === keys.length) i = 0;
        }

        mixedNewsItems.sort((a: DB.Item.JoinedNews, b: DB.Item.JoinedNews) => {
            // let's group the items by sport
            let sportA = a.sport_name;
            let sportB = b.sport_name;
            if (sportA < sportB) return -1;
            if (sportA > sportB) return 1;
            return 0;
        });
        return mixedNewsItems;
    } catch (e) {
        throw `selectMixedNews failed with: ${e}`;
    }
}