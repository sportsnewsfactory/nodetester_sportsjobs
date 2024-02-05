import { MYSQL_DB } from '../classes/MYSQL_DB';
import { RenderMachine } from '../types/RenderMachine';
import { HELPER } from '../classes/HELPER';

export const RENDERFARM = {
    async getAll(DB: MYSQL_DB): Promise<RenderMachine[]> {
        const funcName = 'RENDERFARM.getAll';
        const renderMachines = await HELPER.select<RenderMachine>({
            DB,
            funcName,
            tableName: `config.renderFarm`,
        });
        return renderMachines;
    },
};
