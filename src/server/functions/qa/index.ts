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
        const qaRecords: DB.QARecord[] = await SportsDB.SELECT(TABLES.qa, {
            whereClause: {
                forEdition: TD.editionDateYYYYMMDD,
                is_video_uploaded: false,
                is_lang_approved: false,
                lang,
            },
        });

        let qaRecord: DB.QARecord = {
            lang: lang,
            is_video_uploaded: false,
            is_lang_approved: false,
            forEdition: TD.editionDateYYYYMMDD,
            updated_at: new Date(),
        };

        /**
         * If no QA records are found for the given language,
         * we create one.
         */
        if (qaRecords.length === 0) {
            appendToLogFile(
                TD,
                `No QA records found for lang ${lang}. Let's make one`,
                logFileName,
                logToConsole,
                "pink"
            );

            const { affected } = await SportsDB.INSERT_BATCH_OVERWRITE(
                [qaRecord],
                TABLES.qa
            );

            if (affected < 1) {
                throw `Failed to create QA record for lang ${lang}`;
            }
        } else {
            qaRecord = qaRecords[0];
        }

        /**
         * We now have our QA record. We don't know if it's
         * been processed yet, so we check if the video has
         * been uploaded and if the language has been approved.
         */
        if (qaRecord.is_video_uploaded) {
            if (qaRecord.is_lang_approved) {
                appendToLogFile(
                    TD,
                    `Lang ${lang} has been processed`,
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
                    TD.editionDateYYYYMMDD,
                    lang
                );
            } else {
                // We gotta wait for QA approval
                appendToLogFile(
                    TD,
                    `Lang ${lang} has been uploaded but not approved yet`,
                    logFileName,
                    logToConsole,
                    "yellow"
                );
            }
        } else {
            /**
             * Let's check if a long video of this language has been
             * exported and if so let's upload it to the qa folder.
             */
            await uploadAnyVideoForLangForQA(
                SportsDB,
                TD.editionDateYYYYMMDD,
                lang
            );
        }
    } catch (e) {
        throw `${funcName}: ${e}`;
    }
}
