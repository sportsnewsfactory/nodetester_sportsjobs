import { MYSQL_DB } from '../classes/MYSQL_DB';
import { NAMES } from '../config/DB_NAMES';
import { CORE } from '../types/CORE';
import { DB } from '../types/DB';

export const EDITIONS = {
    async getAll(DB: MYSQL_DB): Promise<DB.Jobs.Edition[]> {
        const editions = await DB.SELECT<DB.Jobs.Edition>(NAMES.editions);
        return editions;
    },
    async getAll_CORE(DB: MYSQL_DB): Promise<CORE.Edition[]> {
        const editions = await DB.SELECT<CORE.Edition>(NAMES.core_editions);
        return editions;
    }
};
