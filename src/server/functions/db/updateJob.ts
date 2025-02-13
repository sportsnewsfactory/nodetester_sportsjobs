import { RowDataPacket } from "mysql2";
import { MYSQL_DB } from "../../../classes/MYSQL_DB";
import { TABLES } from "../../../config/TABLES";
import { LOG } from "../log/LOG";
import { AE } from "../../../types/AE";
import { CORE } from "../../../types/CORE";

type UpdateJobProps = {
    SportsDB: MYSQL_DB,
    nextJob: AE.Job,
    log: string
    newStatus: CORE.Keys.JobStatus
    prevStatus?: CORE.Keys.JobStatus
};

export default async function updateJob({
    SportsDB, nextJob, log, newStatus, prevStatus = 'fresh'
}: UpdateJobProps ){
    console.log(`Updating job ${nextJob.brand_name} ${nextJob.product_name} ${nextJob.lang} ${prevStatus} status to ${newStatus}`);
    
    const updateSQL = `
        UPDATE ${TABLES.jobs}
        SET status = '${newStatus}'
        WHERE brand_name = '${nextJob.brand_name}'
        AND product_name = '${nextJob.product_name}'
        AND lang = '${nextJob.lang}'
        AND status = '${prevStatus}';
    `;

    const updateResult = await SportsDB.pool.execute(updateSQL);
    if ((updateResult[0] as RowDataPacket).affectedRows === 1) 
        LOG.consoleAndWrite(log, `Job status updated to ${newStatus}`, 'green');
    else throw `Job status not updated to ${newStatus}`;
}