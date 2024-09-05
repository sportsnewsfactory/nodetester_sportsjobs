import { MYSQL_DB } from "../../../classes/MYSQL_DB";
import { TABLES } from "../../../config/TABLES";
import { AE } from "../../../types/AE";
import { CORE } from "../../../types/CORE";
import getNewsItemsByEdition from "./newsItemsByEdition";
import getTimestamp from "./timestamp";

export default async function getEdition(DB: MYSQL_DB, job: AE.Job): Promise<CORE.Edition> {
    const funcName = `getEdition`;
    const formattedDate: string = getTimestamp({
        month: '2-digit', 
        day: '2-digit', 
        year: '2-digit'
    }).replace(/\//g, '');

    // const DB = new MYSQL_DB();
    // DB.createPool('SPORTS');

    try {
        const getEditionSQL = `
            SELECT * FROM ${TABLES.editions}
            WHERE brand_name = '${job.brand_name}'
            AND product_name = '${job.product_name}'
            AND lang = '${job.lang}';
        `;
        const execResult = await DB.pool.execute(getEditionSQL);
        const editions = execResult[0] as CORE.Edition[];
        if (editions.length !== 1) throw `No editions found for ${job.brand_name}, ${job.product_name}, ${job.lang}`;
        
        let edition = editions[0];
        edition.project_file_name += '.aep';
        edition.export_file_name = `${edition.export_file_name.replace('$DATE', formattedDate)}.mp4`;
        edition.project_save_file_name = `${edition.project_save_file_name.replace('$DATE', formattedDate)}.aep`;

        return edition;
    } catch (e) {
        throw `${funcName}: ${e}`;
    } 
    // finally {
    //     await DB.pool.end();
    // }
}