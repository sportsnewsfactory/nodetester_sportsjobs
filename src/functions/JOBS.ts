import { HELPER, Helper } from "../classes/HELPER";
import { MYSQL_DB } from "../classes/MYSQL_DB";
import { DB_NAMES } from "../config/DB_NAMES";
import { DB } from "../types/DB";

export const JOBS = {
    async test(DB: MYSQL_DB): Promise<DB.Job[]>{
        const funcName = `JOBS.test`;
        const tableName = `${DB_NAMES.config}.jobs`;
        const helperProps: Helper.Select = {
            DB,
            tableName,
            funcName
        };
        
        const jobs = await HELPER.select<DB.Job>(helperProps);
        return jobs;
    }
}