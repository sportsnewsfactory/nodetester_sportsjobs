import fs from "fs";

import { CORE } from "../types/CORE";
import { MYSQL_DB } from "../classes/MYSQL_DB";
import getProduct from "./functions/get/product";
import { LOG } from "./functions/log/LOG";
import getTimestamp from "./functions/get/timestamp";
import { AE } from "../types/AE";
import { TABLES } from "../config/TABLES";
import { TimeDeltas } from "../V2/classes/TimeDeltas";
import { appendToLogFile } from "../V2/utils/appendToLog";
import identifyRenderMachine from "../functions/identifyRenderMachine";
import { editSingleFreshJob } from "./functions/process/AERenderVersion/jobs/edit";
import { renderSingleEditedJob } from "./functions/process/AERenderVersion/jobs/render";
import { S3Bucket } from "../V2/classes/AWS/S3Bucket";
import { BUCKETS } from "../config/BUCKETS";
import updateJob from "./functions/db/updateJob";
import { DB } from "../types/DB";
import { table } from "console";
import qaForLang from "./functions/qa";

// will be used to check if system is busy
const systemBusyFilePath = `G:/My Drive/Sports/systemBusy.txt`;

export default async function SERVER_MAIN(
    logToConsole: boolean = true,
    debugMode: boolean = false
) {
    const funcName = `SERVER_MAIN`;

    /**
     * Initialize the databases,
     * TimeDeltas, logFile and renderMachine.
     */
    const SportsDB = new MYSQL_DB();
    SportsDB.createPool("SPORTS");
    const BackofficeDB = new MYSQL_DB();
    BackofficeDB.createPool("BACKOFFICE");

    const RM = await identifyRenderMachine(SportsDB);
    const TD = new TimeDeltas();
    const nowYYYYMMDDhhmmss = TD.formatYYYYMMDDhhmmss(new Date());
    const logFileName = `${nowYYYYMMDDhhmmss}.txt`;

    /**
     * Log first message to the log file.
     */
    let nextMessage = `Server Main started @ ${nowYYYYMMDDhhmmss}${
        debugMode ? ` in debug mode` : ""
    }`;

    appendToLogFile(
        TD,
        nextMessage,
        logFileName,
        logToConsole,
        debugMode ? "cyan" : "pink"
    );

    try {
        !debugMode && checkIfSystemIsBusy();

        const goOverFreshJobs = async () => {
            const freshJobs: AE.Job[] = await SportsDB.SELECT(TABLES.jobs, {
                whereClause: { status: "fresh" },
            });

            // throw JSON.stringify(freshJobs, null, 4);

            if (freshJobs.length === 0) {
                nextMessage = `No fresh jobs found`;
                appendToLogFile(
                    TD,
                    nextMessage,
                    logFileName,
                    logToConsole,
                    "orange"
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
                            debugMode
                        );
                    } catch (e) {
                        LOG.message(`${e}`, "red");
                    }
                }
            }
        };

        await goOverFreshJobs();

        const goOverEditedJobs = async () => {
            const editedJobs: AE.Job[] = await SportsDB.SELECT(TABLES.jobs, {
                whereClause: { status: "edited" },
            });

            if (editedJobs.length === 0) {
                nextMessage = `No edited jobs found`;
                appendToLogFile(
                    TD,
                    nextMessage,
                    logFileName,
                    logToConsole,
                    "orange"
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
                            debugMode
                        );
                    } catch (e) {
                        LOG.message(`${e}`, "red");
                    }
                }
            }
        };

        await goOverEditedJobs();

        const QAProcedure = async () => {
            appendToLogFile(
                TD,
                `QAProcedure started`,
                logFileName,
                logToConsole
            );

            const activeLangs = await SportsDB.SELECT<{
                lang: string;
                active: boolean;
            }>(TABLES.langs, {
                whereClause: { active: true },
            });

            for (const activeLang of activeLangs) {
                const result = await qaForLang(
                    activeLang.lang,
                    SportsDB,
                    TD,
                    logFileName,
                    logToConsole
                );
            }
        };

        await QAProcedure();
    } catch (e) {
        // handle error
        nextMessage = `${funcName} failed @ ${getTimestamp()} with error: ${e}`;
        appendToLogFile(TD, nextMessage, logFileName, logToConsole, "red");
    } finally {
        await SportsDB.pool.end();
        await BackofficeDB.pool.end();
        // await cleanup();
    }
}

function checkIfSystemIsBusy() {
    // create systemBusy file if it doesn't exist
    if (!fs.existsSync(systemBusyFilePath)) {
        console.log(`Creating systemBusy file at ${systemBusyFilePath}`);
        fs.writeFileSync(systemBusyFilePath, "false");
    }

    let systemBusy = fs.readFileSync(systemBusyFilePath).toString() === "true";
    if (systemBusy) throw `System is busy`;
}
