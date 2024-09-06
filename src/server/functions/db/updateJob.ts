import { RowDataPacket } from "mysql2";
import { MYSQL_DB } from "../../../classes/MYSQL_DB";
import { TABLES } from "../../../config/TABLES";
import { LOG } from "../log/LOG";
import { AE } from "../../../types/AE";

type UpdateJobProps = {
    SportsDB: MYSQL_DB,
    nextJob: AE.Job,
    log: string
};

export default async function updateJob({
    SportsDB, nextJob, log
}: UpdateJobProps ){
    const updateSQL = `
        UPDATE ${TABLES.jobs}
        SET status = 'processing'
        WHERE brand_name = '${nextJob.brand_name}'
        AND product_name = '${nextJob.product_name}'
        AND lang = '${nextJob.lang}'
        AND status = 'fresh';
    `;

    const updateResult = await SportsDB.pool.execute(updateSQL);
    if ((updateResult[0] as RowDataPacket).affectedRows === 1) 
        LOG.consoleAndWrite(log, `Job status updated to 'processing'`, 'green');
    else throw `Job status not updated to 'processing'`;
}