import { RowDataPacket } from "mysql2";
import { MYSQL_DB } from "../../../classes/MYSQL_DB";
import { TABLES } from "../../../config/TABLES";
import { LOG } from "../log/LOG";
import { AE } from "../../../types/AE";
import { CORE } from "../../../types/CORE";

type UpdateJobProps = {
    SportsDB: MYSQL_DB;
    nextJob: AE.Job;
    newStatus: CORE.Keys.JobStatus;
    dateString: string;
};

export default async function updateJob({
    SportsDB,
    nextJob,
    newStatus,
    dateString,
}: UpdateJobProps): Promise<boolean> {
    const funcName = "updateJob";
    try {
        console.log(
            `Updating job ${nextJob.brand_name} ${nextJob.product_name} ${nextJob.lang} ${dateString} status to ${newStatus}`
        );

        const updateSQL = `
            UPDATE ${TABLES.jobs}
            SET status = '${newStatus}'
            WHERE brand_name = '${nextJob.brand_name}'
            AND product_name = '${nextJob.product_name}'
            AND lang = '${nextJob.lang}'
            AND target_date = '${dateString}'
        `;

        const updateResult = await SportsDB.pool.execute(updateSQL);
        if ((updateResult[0] as RowDataPacket).affectedRows === 1) return true;
        throw `Job status not updated to ${newStatus}`;
    } catch (e) {
        throw `${funcName}: ${e}`;
    }
}
