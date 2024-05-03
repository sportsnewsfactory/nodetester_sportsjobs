'use server';

import { MYSQL_DB } from '../classes/MYSQL_DB';
import { coreTables } from '../constants/coreTables';
import { DB } from '../types/DB';
import os from 'os';

export default async function identifyRenderMachine(
    DB: MYSQL_DB
): Promise<DB.RenderMachine> {
    const funcName = 'identifyRenderMachine';
    try {
        const username = os.userInfo().username;
        const renderMachine = await DB.SELECT<DB.RenderMachine>(
            coreTables.renderFarm,
            { whereClause: { root_user_name: username } }
        );
        if (
            !renderMachine ||
            !renderMachine.length ||
            renderMachine.length !== 1
        )
            throw new Error(`No render machine found for user ${username}`);

        return renderMachine[0];
    } catch (e) {
        throw `Error in ${funcName}: ${e}`;
    }
}
