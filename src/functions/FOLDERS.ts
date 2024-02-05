import { MYSQL_DB } from '../classes/MYSQL_DB';
import { NAMES } from '../config/DB_NAMES';
import { DB } from '../types/DB';

export const FOLDERS = {
    async getAll(DB: MYSQL_DB): Promise<DB.Jobs.Folder[]> {
        const folders = await DB.SELECT<DB.Jobs.Folder>(NAMES.folders);
        return folders;
    },
};
