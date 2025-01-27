import { MYSQL_DB } from "../classes/MYSQL_DB";
import { Sport, TABLES, TransNewsTables } from "../config/TABLES";
import { TransNewsItem } from "./types";

/**
 * Here we'll be removing either the first untranslated 
 * HI basketball item or the last basketball item, 
 * if none have been translated.
 * If all basketball items have been translated,
 * something is wrong and we'll throw an error.
 * We'll also remove the AR and EN Cricket items.
 */
export default async function reorganizeTransNews(){
    // init databases
    const SportsDB = new MYSQL_DB(); 
    SportsDB.createPool('SPORTS');

    try {
        const targetDate = getTargetDateFormatted();
        await deleteIrrelevantItems(SportsDB, targetDate);

        const removedHIBBItem: boolean = await removeHIBasketBallItem(SportsDB, targetDate);
        console.log(`Removed HI basketball item status: ${removedHIBBItem}`);
        // throw `removeHIBasketBallItem`;
        /**
         * With the Cricket items it's much simpler.
         * We only need the single HI item.
         * All others will be removed.
         */
        const cricketTransItems: TransNewsItem[] =
            await SportsDB.SELECT(TransNewsTables.Cricket);

        for (let item of cricketTransItems){
            if (item.lang !== 'HI'){
                const deleteSQL = `DELETE FROM ${TransNewsTables.Cricket} WHERE item_id = '${item.item_id}' AND lang = '${item.lang}'`;
                const resultPackage = await SportsDB.pool.query(deleteSQL);
                const result: boolean = (resultPackage[0] as any).affectedRows > 0;
                // const result: boolean = await SportsDB.DELETE(TransNewsTables.Cricket, {whereClause: {item_id: item.item_id}});
                if (!result) throw `Failed to delete ${item.lang} cricket item ${item.item_id}`;
                console.log(`Deleted ${item.lang} cricket item ${item.item_id}`);
            }
        }
    } catch (e) {
        console.warn(e);
    } finally {
        await SportsDB.pool.end();
    }
}

/**
 * This function runs after midnight every day.
 * So the target date is today's date in ddmmyy format.
 */
function getTargetDateFormatted(){
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yy = String(today.getFullYear()).slice(2);
    return dd + mm + yy;
}

/**
 * If we happen to stumble upon a translated item
 * where the id doesn't include today's date (ddmmyy),
 * we'll remove it.
 */
async function deleteIrrelevantItems(SportsDB: MYSQL_DB, targetDate: string){
    const targetSports: Sport[] = ['Misc', 'Tennis'];
    for (let sport of targetSports){
        try {
            const transNewsTable = TransNewsTables[sport];
            const items: TransNewsItem[] = await SportsDB.SELECT(transNewsTable);
            if (items.length === 0) continue;
            for (let item of items){
                if (!item.item_id.includes(targetDate)){
                    // const result: boolean = await SportsDB.DELETE(transNewsTable, {whereClause: {item_id: item.item_id}});
                    const deleteSQL = `DELETE FROM ${transNewsTable} WHERE item_id = '${item.item_id}'`;
                    const resultPackage = await SportsDB.pool.query(deleteSQL);
                    const result: boolean = (resultPackage[0] as any).affectedRows > 0;
                    if (!result) throw `Failed to delete irrelevant ${item.lang} ${sport} item ${item.item_id}`;
                    console.log(`Deleted irrelevant ${item.lang} ${sport} item ${item.item_id}`);
                }
            }
        } catch (e) {
            console.warn(`Failed to delete irrelevant ${sport} items: ${e}`);
        }
    }
}

async function removeHIBasketBallItem(
    SportsDB: MYSQL_DB, 
    targetDate: string
): Promise<boolean> {
    try {
        /**
         * We'll look at the original basketball items to verify
         * we're not accidentally deleting more than one.
         */
        const originalBasketballItems: {id: string}[] = await SportsDB.SELECT('Basketball.RAPID__NEWS');
        if (originalBasketballItems.length === 0) throw `No original basketball items found`;
        const todaysBasketballItems = originalBasketballItems.filter(
            item => item.id.includes(targetDate)
        );

        const basketballItems: TransNewsItem[] = 
            await SportsDB.SELECT(TransNewsTables.Basketball);
        if (basketballItems.length === 0) throw `No basketball items found`;

        const hiBasketballItems = basketballItems.filter(item => item.lang === 'HI');
        if (hiBasketballItems.length === 0) throw `No HI basketball items found`;

        if (hiBasketballItems.length !== todaysBasketballItems.length)
            throw `HI basketball items count doesn't match original items count: HI ${hiBasketballItems.length} vs EN ${todaysBasketballItems.length}`;

        // start from the last item
        for (let i = hiBasketballItems.length - 1; i >= 0; i--){
            const item = hiBasketballItems[i];
            const enOriginal = basketballItems.find(
                bItem => bItem.item_id === item.item_id && 
                bItem.lang === 'EN'
            );
            if (!enOriginal) throw `No EN original found for HI item ${item.item_id}`;
            
            const hasBeenTranslated: boolean = 
                item.headline !== enOriginal.headline && 
                item.sub_headline !== enOriginal.sub_headline &&
                item.narration !== enOriginal.narration;

            if (!hasBeenTranslated){
                // const result: boolean = await SportsDB.DELETE(TransNewsTables.Basketball, {whereClause: {item_id: item.item_id}});
                const deleteSQL = `DELETE FROM ${TransNewsTables.Basketball} WHERE item_id = '${item.item_id}' AND lang = 'HI'`;
                const resultPackage = await SportsDB.pool.query(deleteSQL);
                const result: boolean = (resultPackage[0] as any).affectedRows > 0;
                if (!result) throw `Failed to delete HI basketball item ${item.item_id}`;
                console.log(`Deleted HI basketball item ${item.item_id}`);
                return true;
            } else {
                console.log(`HI basketball item ${item.item_id} has been translated. Checking previous item...`);
            }
        }

        /**
         * If we reach this point, 
         * it means all basketball items have been translated.
         * This is an error.
         */
        console.warn(`All basketball items have been translated into HI`);
        return false;
    } catch (e) {
        // throw `removeHIBasketBallItem: ${e}`;
        console.warn(`removeHIBasketBallItem: ${e}`);
        return false;
    }
}