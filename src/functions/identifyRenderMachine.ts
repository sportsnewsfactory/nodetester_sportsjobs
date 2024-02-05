import { MYSQL_DB } from '../classes/MYSQL_DB';
import { RENDERFARM } from './RENDERFARM';
import { RenderMachine } from '../types/RenderMachine';
import os from 'os';

export default async function identifyRenderMachine(
    DB: MYSQL_DB
): Promise<RenderMachine> {
    const funcName = 'identifyRenderMachine';
    try {
        const username = os.userInfo().username;
        const renderMachines: RenderMachine[] = await RENDERFARM.getAll(DB);
        const renderMachine = renderMachines.find(
            (renderMachine) => renderMachine.root_user_name === username
        );
        if (!renderMachine) {
            throw `No render machine found for user ${username}`;
        }
        return renderMachine;
    } catch (e) {
        throw `Error in ${funcName}: ${e}`;
    }
}
