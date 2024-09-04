import { MYSQL_DB } from "../../../classes/MYSQL_DB";
import { TABLES } from "../../../config/TABLES";
import { AE } from "../../../types/AE";

export default async function getNextJob(DB: MYSQL_DB): Promise<AE.Job | null> {
    const funcName = 'getNextJob';
    try {
        const jobs: AE.Job[] = await DB.SELECT(TABLES.jobs, { whereClause: { status: 'fresh' } });
        if (jobs && jobs.length > 0) return jobs[0];
        return null;
    } catch (e) {
        console.warn(`${funcName}: ${e}`);
        return null;
    }
}