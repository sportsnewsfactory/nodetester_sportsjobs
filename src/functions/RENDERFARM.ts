import { MYSQL_DB } from '../classes/MYSQL_DB';
import { HELPER } from '../classes/HELPER';
import { DB } from '../types/DB';

export const RENDERFARM = {
    async getAll(DB: MYSQL_DB): Promise<DB.RenderMachine[]> {
        const funcName = 'RENDERFARM.getAll';
        const renderMachines = await HELPER.select<DB.RenderMachine>({
            DB,
            funcName,
            tableName: `economicnews.ECN_CORE_renderFarm` //`config.renderFarm`,
        });
        return renderMachines;
    },
};
