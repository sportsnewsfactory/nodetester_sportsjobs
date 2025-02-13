import fs from 'fs';

import { CORE } from '../types/CORE';
import getEdition from './functions/get/edition';
import { MYSQL_DB } from '../classes/MYSQL_DB';
import getBrand from './functions/get/brand';
import getProduct from './functions/get/product';
import { EDIT, GenericProcessProps } from './functions/process/EDIT';
import { LOG } from './functions/log/LOG';
import getTimestamp from './functions/get/timestamp';
import recognizeError from './functions/error/recognize';
import { AE } from '../types/AE';
import updateJob from './functions/db/updateJob';
import { TABLES } from '../config/TABLES';
import { VictorResult } from './functions/process/AERenderVersion/processVictorResult';
import handleGoogleDriveReadError__AERENDER from './functions/error/handleGoogleDriveRead__AERENDER';
import { TimeDeltas } from '../V2/classes/TimeDeltas';
import { appendToLogFile } from '../V2/utils/appendToLog';
import { Paths } from '../types/CORE/Paths';
import { getGeneralPaths } from '../functions/R2R/components/getGeneralPaths';
import { coreTables } from '../constants/coreTables';
import { getSubfolderStrucure } from '../functions/R2R/components/getSubfolderStructure';
import { DB } from '../types/DB';
import identifyRenderMachine from '../functions/identifyRenderMachine';
import { getAERenderPath } from '../V2/config/constants/getAERenderPath';
import { PATHS } from '../functions/PATHS';
import { AERender } from '../V2/classes/AERender';
import { editSingleFreshJob } from './functions/process/AERenderVersion/jobs/edit';
import { renderSingleEditedJob } from './functions/process/AERenderVersion/jobs/render';

// will be used to check if system is busy
const systemBusyFilePath = `G:/My Drive/Sports/systemBusy.txt`;

export default async function SERVER_MAIN(
    logToConsole: boolean = true, 
    debugMode: boolean = false
){
    const funcName = `SERVER_MAIN`;

    /**
     * Initialize the databases,
     * TimeDeltas, logFile and renderMachine.
     */
    const SportsDB = new MYSQL_DB();
    SportsDB.createPool('SPORTS');
    const BackofficeDB = new MYSQL_DB();
    BackofficeDB.createPool('BACKOFFICE');

    const RM = await identifyRenderMachine(SportsDB);
    const TD = new TimeDeltas();
    const nowYYYYMMDDhhmmss = TD.formatYYYYMMDDhhmmss(new Date());
    const logFileName = `test ${nowYYYYMMDDhhmmss}.txt`;

    /**
     * Log first message to the log file.
     */
    let nextMessage = `Started test @ ${nowYYYYMMDDhhmmss}${debugMode && ` in debug mode`}`;
    appendToLogFile(TD, nextMessage, logFileName, logToConsole, debugMode ? 'cyan' : 'pink');

    try {
        !debugMode && checkIfSystemIsBusy();

        const goOverFreshJobs = async () => {
            const freshJobs: AE.Job[] = await SportsDB.SELECT(TABLES.jobs, {
                whereClause: { status: 'fresh' },
            });

            // throw JSON.stringify(freshJobs, null, 4);

            if (freshJobs.length === 0) {
                nextMessage = `No fresh jobs found`;
                appendToLogFile(
                    TD,
                    nextMessage,
                    logFileName,
                    logToConsole,
                    'orange'
                );
                // return true;
            } else {
                for (const job of freshJobs) {
                    try {
                        await editSingleFreshJob(
                            RM,
                            TD,
                            job,
                            SportsDB,
                            BackofficeDB,
                            logFileName,
                            debugMode,
                        );
                    } catch (e) {
                        LOG.message(`${e}`, 'red');
                    }
                }
            }
        };

        await goOverFreshJobs();

        const goOverEditedJobs = async () => {
            const editedJobs: AE.Job[] = await SportsDB.SELECT(TABLES.jobs, {
                whereClause: { status: 'edited' },
            });

            if (editedJobs.length === 0) {
                nextMessage = `No edited jobs found`;
                appendToLogFile(
                    TD,
                    nextMessage,
                    logFileName,
                    logToConsole,
                    'orange'
                );
                // return true;
            } else {
                for (const job of editedJobs) {
                    try {
                        await renderSingleEditedJob(
                            RM,
                            TD,
                            job,
                            SportsDB,
                            BackofficeDB,
                            logFileName,
                            debugMode,
                        );
                    } catch (e) {
                        LOG.message(`${e}`, 'red');
                    }
                }
            }
        };

        await goOverEditedJobs();
    } catch (e) {
        // handle error
        nextMessage = `${funcName} failed @ ${getTimestamp()} with error: ${e}`;
        appendToLogFile(TD, nextMessage, logFileName, logToConsole, 'red');
    } finally {
        await SportsDB.pool.end();
        await BackofficeDB.pool.end();
        // await cleanup();
    }
}

function checkIfSystemIsBusy() {
    // create systemBusy file if it doesn't exist
    if (!fs.existsSync(systemBusyFilePath))
        fs.writeFileSync(systemBusyFilePath, 'false');

    let systemBusy = fs.readFileSync(systemBusyFilePath).toString() === 'true';
    if (systemBusy) throw `System is busy`;
}
