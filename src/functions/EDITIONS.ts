import { MYSQL_DB } from '../classes/MYSQL_DB';
import { NAMES } from '../config/DB_NAMES';
import { DB } from '../types/DB';

export const EDITIONS = {
    async getAll(DB: MYSQL_DB): Promise<DB.Jobs.Edition[]> {
        const editions = await DB.SELECT<DB.Jobs.Edition>(NAMES.editions);
        return editions;
    },
};
