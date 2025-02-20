import { MYSQL_DB } from "../../../../classes/MYSQL_DB";
import { TABLES } from "../../../../config/TABLES";
import { AE } from "../../../../types/AE";
import { CORE } from "../../../../types/CORE";
import uploadSingleJob from "./uploadSingleJob";

export default async function uploadAnyVideoForLangForQA(
    SportsDB: MYSQL_DB,
    targetDateString: string,
    lang: string
) {
    const funcName = "uploadAnyVideoForLangForQA";
    try {
        const qualifiedJobs: AE.Job[] = await SportsDB.SELECT(TABLES.jobs, {
            whereClause: {
                target_date: targetDateString,
                lang,
                product_name: "AE_Daily_News",
                status: "rendered",
            },
        });

        if (qualifiedJobs.length === 0) {
            console.warn(
                `No AE_Daily_News jobs found for lang ${lang} for date: ${targetDateString}`
            );
            return true;
        }

        const firstQualifiedJob = qualifiedJobs[0];

        const qa = true;
        const newStatus: CORE.Keys.JobStatus = "qa-pending";

        uploadSingleJob(
            SportsDB,
            firstQualifiedJob,
            targetDateString,
            newStatus,
            qa
        );

        await SportsDB.UPDATE(
            TABLES.qa,
            { is_video_uploaded: true },
            {
                forEdition: targetDateString,
                lang,
                is_video_uploaded: false,
            }
        );
    } catch (e) {
        throw `${funcName}: ${e}`;
    }
}
