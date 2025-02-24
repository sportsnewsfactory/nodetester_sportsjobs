import { MYSQL_DB } from "../../../../classes/MYSQL_DB";
import { TABLES } from "../../../../config/TABLES";
import { AE } from "../../../../types/AE";
import { CORE } from "../../../../types/CORE";
import { TimeDeltas } from "../../../../V2/classes/TimeDeltas";
import uploadSingleJob from "./uploadSingleJob";

/**
 * This includes the video that was used for QA
 * which is in qa-ready status while the other are
 * either not exported or in rendered status.
 */
export default async function uploadAllExportedVideosForLang(
    SportsDB: MYSQL_DB,
    TD: TimeDeltas,
    logFileName: string,
    lang: string
) {
    const funcName = `uploadAllExportedVideosForLang`;
    try {
        const jobsForDateForLang: AE.Job[] = await SportsDB.SELECT(
            TABLES.jobs,
            {
                whereClause: {
                    target_date: TD.editionDateYYYYMMDD,
                    lang,
                },
            }
        );

        const qualifiedJobs: AE.Job[] = jobsForDateForLang.filter(
            (job) => job.status === "qa-ready" || job.status === "rendered"
        );

        if (qualifiedJobs.length === 0) {
            console.warn(
                `No jobs found for lang ${lang} for date: ${TD.editionDateYYYYMMDD}`
            );
            return true;
        }

        for (const job of qualifiedJobs) {
            const qa = false;
            const newStatus: CORE.Keys.JobStatus = "uploaded";

            await uploadSingleJob(
                SportsDB,
                TD,
                job,
                newStatus,
                logFileName,
                qa
            );
        }
    } catch (e) {
        throw `${funcName}: ${e}`;
    }
}
