import { MYSQL_DB } from "../../../classes/MYSQL_DB";
import { TABLES } from "../../../config/TABLES";
import { DB } from "../../../types/DB";
import { TimeDeltas } from "../../../V2/classes/TimeDeltas";
import { appendToLogFile } from "../../../V2/utils/appendToLog";
import uploadAllExportedVideosForLang from "./res/uploadAllExportedVideosForLang";
import uploadAnyVideoForLangForQA from "./res/uploadAnyVideoForLangForQA";

export default async function qaForLang(
    lang: string,
    SportsDB: MYSQL_DB,
    TD: TimeDeltas,
    logFileName: string,
    logToConsole: boolean
) {
    const funcName = "qaForLang";

    try {
        /**
         * We start by looking for the QA records
         * where the language has not been processed yet.
         */
        const qaRecordsForLang: DB.QARecord[] = await SportsDB.SELECT(
            TABLES.qa,
            {
                whereClause: { lang },
            }
        );

        let qaRecord = {} as DB.QARecord;

        if (qaRecordsForLang.length === 0) {
            appendToLogFile(
                TD,
                `No QA records found for lang ${lang}. Let's make one`,
                logFileName,
                logToConsole,
                "pink"
            );
            qaRecord = await makeNewQARecord(SportsDB, lang, TD);
        } else {
            const qaRecordsForDate: DB.QARecord[] = qaRecordsForLang.filter(
                (qaRecord) => qaRecord.forEdition === TD.editionDateYYYYMMDD
            );

            if (qaRecordsForDate.length === 0) {
                appendToLogFile(
                    TD,
                    `No QA records found for lang ${lang} for date ${TD.editionDateYYYYMMDD}. Let's make one`,
                    logFileName,
                    logToConsole,
                    "pink"
                );
                qaRecord = await makeNewQARecord(SportsDB, lang, TD);
            } else {
                qaRecord = qaRecordsForDate[0];
            }
        }

        /**
         * We now have our QA record for @param target_date.
         * Let's check if it's been processed.
         */
        if (qaRecord.is_lang_approved) {
            appendToLogFile(
                TD,
                `Lang ${lang} has been approved. Let's upload all rendered videos`,
                logFileName,
                logToConsole,
                "green"
            );

            /**
             * Let's check if there are any new exports to upload
             * for this language and if so let's upload them.
             */
            await uploadAllExportedVideosForLang(
                SportsDB,
                TD,
                logFileName,
                lang
            );

            return;
        }

        if (qaRecord.is_video_uploaded) {
            appendToLogFile(
                TD,
                `Lang ${lang} has been uploaded but not approved yet. Let's wait for approval`,
                logFileName,
                logToConsole,
                "yellow"
            );
            return;
        }

        /**
         * Let's check if a long video of this language has been
         * exported and if so let's upload it to the qa folder.
         */
        appendToLogFile(
            TD,
            `Lang ${lang} has not been submitted for QA yet. Let's see if there's a video to upload`,
            logFileName,
            logToConsole,
            "magenta"
        );

        await uploadAnyVideoForLangForQA(SportsDB, TD, logFileName, lang);
    } catch (e) {
        throw `${funcName}: ${e}`;
    }
}

export async function makeNewQARecord(
    SportsDB: MYSQL_DB,
    lang: string,
    TD: TimeDeltas
) {
    const funcName = "makeNewQARecord";

    try {
        let qaRecord: DB.QARecord = {
            lang: lang,
            is_video_uploaded: false,
            is_lang_approved: false,
            forEdition: TD.editionDateYYYYMMDD,
            updated_at: new Date(),
        };

        await SportsDB.INSERT_BATCH_OVERWRITE([qaRecord], TABLES.qa);

        return qaRecord;
    } catch (e) {
        throw `${funcName}: ${e}`;
    }
}
