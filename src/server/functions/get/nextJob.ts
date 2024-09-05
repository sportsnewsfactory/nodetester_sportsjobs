import { MYSQL_DB } from "../../../classes/MYSQL_DB";
import { TABLES } from "../../../config/TABLES";
import { AE } from "../../../types/AE";
import { CORE } from "../../../types/CORE";

export default async function getNextJob(DB: MYSQL_DB, status?: CORE.Keys.JobStatus): Promise<AE.Job | null> {
    const funcName = 'getNextJob';
    try {
        const jobs: AE.Job[] = await DB.SELECT(TABLES.jobs, { whereClause: { status: status || 'fresh' } });
        if (jobs && jobs.length > 0) return jobs[0];
        return null;
    } catch (e) {
        console.warn(`${funcName}: ${e}`);
        return null;
    }
}