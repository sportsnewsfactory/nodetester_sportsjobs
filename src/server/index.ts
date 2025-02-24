import fs from "fs";

import { MYSQL_DB } from "../classes/MYSQL_DB";
import { LOG } from "./functions/log/LOG";
import getTimestamp from "./functions/get/timestamp";
import { AE } from "../types/AE";
import { TABLES } from "../config/TABLES";
import { TimeDeltas } from "../V2/classes/TimeDeltas";
import { appendToLogFile } from "../V2/utils/appendToLog";
import identifyRenderMachine from "../functions/identifyRenderMachine";
import { editSingleFreshJob } from "./functions/process/AERenderVersion/jobs/edit";
import { renderSingleEditedJob } from "./functions/process/AERenderVersion/jobs/render";
import { DB } from "../types/DB";
import qaForLang from "./functions/qa";

// will be used to check if system is busy
const systemBusyFilePath = `G:/My Drive/Sports/systemBusy.txt`;

/**
 * If we're in wasteful mode, we'll
 * process videos even if the sample edition hasn't
 * undergone QA.
 */
export default async function SERVER_MAIN(
    logToConsole: boolean = true,
    debugMode: boolean = false,
    wastefulMode: boolean = true,
    customDate?: Date
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
    const TD = new TimeDeltas(customDate);
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
            const activeLangs = await SportsDB.SELECT<{
                lang: string;
                active: boolean;
            }>(TABLES.langs, {
                whereClause: { active: true },
            });

            for (const activeLang of activeLangs) {
                const lang = activeLang.lang;

                /**
                 * We start by looking for the QA records
                 * where the language has not been processed yet.
                 */
                const qaRecordsForLang: DB.QARecord[] = await SportsDB.SELECT(
                    TABLES.qa,
                    {
                        whereClause: {
                            lang,
                            forEdition: TD.editionDateYYYYMMDD,
                        },
                    }
                );

                if (qaRecordsForLang.length === 0) {
                    appendToLogFile(
                        TD,
                        `No QA records found for lang ${lang}. Continuing...`,
                        logFileName,
                        logToConsole,
                        "pink"
                    );
                    continue;
                }

                /**
                 * There's only one row for a given lang
                 * and date. Let's check if it's approved or not
                 */
                const qaRecord: DB.QARecord = qaRecordsForLang[0];

                if (qaRecord.is_lang_approved || wastefulMode) {
                    // We process all fresh jobs
                    const freshJobsForLang: AE.Job[] = await SportsDB.SELECT(
                        TABLES.jobs,
                        {
                            whereClause: {
                                status: "fresh",
                                lang,
                                target_date: TD.editionDateYYYYMMDD,
                            },
                        }
                    );

                    for (const job of freshJobsForLang) {
                        await editSingleFreshJob(
                            RM,
                            TD,
                            job,
                            SportsDB,
                            BackofficeDB,
                            logFileName,
                            debugMode
                        );
                    }
                } else {
                    if (qaRecord.is_video_uploaded) {
                        /**
                         * We are not in wastefulMode and
                         * a QA video has been uploaded but not yet approved.
                         * So we continue to the next language.
                         * If there's only one AE_Daily_News job per
                         * language, so we won't ever get here.
                         */
                        continue;
                    } else {
                        /**
                         * We are not in wastefulMode and the QA status
                         * for the given language hasn't commenced yet
                         * as the video hasn't been uploaded for QA.
                         * So we process one sample fresh jobs and continue
                         * to a full cycle of rendering and uploading.
                         */
                        const qaSampleJobs: AE.Job[] = await SportsDB.SELECT(
                            TABLES.jobs,
                            {
                                whereClause: {
                                    status: "fresh",
                                    product_name: "AE_Daily_News",
                                    lang,
                                    target_date: TD.editionDateYYYYMMDD,
                                },
                            }
                        );

                        if (qaSampleJobs.length === 0) {
                            appendToLogFile(
                                TD,
                                `No fresh jobs found for lang ${lang}. Continuing...`,
                                logFileName,
                                logToConsole,
                                "pink"
                            );
                            continue;
                        }

                        const firstJobForQA: AE.Job = qaSampleJobs[0];

                        await editSingleFreshJob(
                            RM,
                            TD,
                            firstJobForQA,
                            SportsDB,
                            BackofficeDB,
                            logFileName,
                            debugMode
                        );
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
                appendToLogFile(
                    TD,
                    `QAProcedure for lang: ${activeLang.lang}`,
                    logFileName,
                    logToConsole,
                    "cyan"
                );

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
