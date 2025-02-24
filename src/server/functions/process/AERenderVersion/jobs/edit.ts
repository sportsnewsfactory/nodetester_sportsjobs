import fs from "fs";
import { MYSQL_DB } from "../../../../../classes/MYSQL_DB";
import { AE } from "../../../../../types/AE";
import { CORE } from "../../../../../types/CORE";
import { DB } from "../../../../../types/DB";
import { TimeDeltas } from "../../../../../V2/classes/TimeDeltas";
import { appendToLogFile } from "../../../../../V2/utils/appendToLog";
import updateJob from "../../../db/updateJob";
import handleGoogleDriveReadError__AERENDER from "../../../error/handleGoogleDriveRead__AERENDER";
import recognizeError from "../../../error/recognize";
import getBrand from "../../../get/brand";
import getEdition from "../../../get/edition";
import getProduct from "../../../get/product";
import getTimestamp from "../../../get/timestamp";
import { GenericProcessProps, EDIT } from "../../EDIT";
import { VictorResult } from "../processVictorResult";

// will be used to check if system is busy
const systemBusyFilePath = `G:/My Drive/Sports/systemBusy.txt`;

export async function editSingleFreshJob(
    RM: DB.RenderMachine,
    TD: TimeDeltas,
    job: AE.Job,
    SportsDB: MYSQL_DB,
    BackofficeDB: MYSQL_DB,
    logFileName: string,
    debugMode: boolean = false
): Promise<void> {
    const funcName = `editSingleFreshJob`;

    let nextMessage = "";

    try {
        // write systemBusy file
        !debugMode && fs.writeFileSync(systemBusyFilePath, "true");

        try {
            nextMessage = `${funcName}: Next job: ${job.brand_name} ${job.product_name} ${job.lang}`;
            appendToLogFile(TD, nextMessage, logFileName, true, "cyan");

            const edition: CORE.Edition = await getEdition(
                SportsDB,
                job,
                TD.editionDateYYYYMMDD
            );
            const brand: CORE.Brand = await getBrand(SportsDB, job.brand_name);
            const product: CORE.Product = await getProduct(
                SportsDB,
                job.product_name
            );

            // throw JSON.stringify(edition, null, 4);

            let processProps: GenericProcessProps = {
                TD,
                SportsDB,
                BackofficeDB,
                brand,
                edition,
                product,
                dbgLevel: 1,
            };

            if (!(product.product_name in EDIT))
                throw `No process found for ${product.product_name}`;
            let victorResult: VictorResult = await EDIT[product.product_name](
                processProps
            );

            nextMessage = `victor result: ${JSON.stringify(
                victorResult,
                null,
                4
            )}`;
            appendToLogFile(TD, nextMessage, logFileName, true, "magenta");

            let potentialErrorName = recognizeError(victorResult.status || "");

            // only in the event of a googleDriveRead error, we'll retry the process.
            if (potentialErrorName === "googleDriveRead")
                victorResult = await handleGoogleDriveReadError__AERENDER({
                    product,
                    processProps,
                    victorResult,
                });

            const victorSecondResult = recognizeError(
                victorResult.status || ""
            );

            console.log(`victorSecondResult: ${victorSecondResult}`);

            if (victorSecondResult === "error") {
                throw victorResult;
            }

            // if there's an error that is not of the following types, throw the result.
            if (
                !(
                    potentialErrorName === "success" ||
                    potentialErrorName === "empty" ||
                    potentialErrorName === "context"
                )
            ) {
                // Let's try not updating the job status to error, so that we can retry the process.
                // await updateJob({ SportsDB, nextJob, log, newStatus: 'error' });
                throw victorSecondResult;
            }

            nextMessage = `Edit completed successfully (${potentialErrorName})`;
            appendToLogFile(TD, nextMessage, logFileName, true, "green");

            const updateResult: boolean = await updateJob({
                SportsDB,
                nextJob: job,
                newStatus: "edited",
                dateString: TD.editionDateYYYYMMDD,
            });

            appendToLogFile(
                TD,
                updateResult
                    ? "Job status updated to edited"
                    : "Failed to update job to edited",
                logFileName,
                true,
                updateResult ? "green" : "red"
            );

            // return victorResult;
        } catch (e) {
            // handle error
            nextMessage = `${job.brand_name} ${job.lang} ${
                job.product_name
            } failed @ ${getTimestamp()} with error: ${e}`;
            appendToLogFile(TD, nextMessage, logFileName, true, "red");
            const updateResult: boolean = await updateJob({
                SportsDB,
                nextJob: job,
                newStatus: "error",
                dateString: TD.editionDateYYYYMMDD,
            });

            appendToLogFile(
                TD,
                updateResult
                    ? "Job status updated to error"
                    : "Failed to update job to error",
                logFileName,
                true,
                updateResult ? "green" : "red"
            );
        }
    } catch (e) {
        throw `${funcName}: ${e}`;
    } finally {
        // write systemBusy file
        !debugMode && fs.writeFileSync(systemBusyFilePath, "false");
    }
}
