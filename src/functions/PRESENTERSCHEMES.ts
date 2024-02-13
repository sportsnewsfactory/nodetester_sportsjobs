import { MYSQL_DB } from "../classes/MYSQL_DB";
import { NAMES } from "../config/DB_NAMES";
import { DB } from "../types/DB";

export const PRESENTERSCHEMES = {
    async getByName(DB: MYSQL_DB, schemeName: string): Promise<DB.Jobs.PresenterSchemeRecord[]> {
        const result = await DB.SELECT<DB.Jobs.PresenterSchemeRecord>(
            NAMES.presenterSchemes, 
            {whereClause: { name: schemeName }}
        );
        return result;
    }
    
}