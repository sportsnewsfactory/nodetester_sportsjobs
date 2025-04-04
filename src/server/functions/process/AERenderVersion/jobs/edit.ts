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
import recognizeErrorV2 from "../../../error/recognizeV2";

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
): Promise<VictorResult> {
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

            let potentialErrorName: string = recognizeErrorV2(victorResult);

            if (victorResult.statusCode !== 200){
                appendToLogFile(TD, `victorResult.statusCode !== 200 first round. Message: ${victorResult.message}`, logFileName, true, "red");
            }

            // only in the event of a googleDriveRead error, we'll retry the process.
            if (potentialErrorName === "googleDriveRead")
                victorResult = await handleGoogleDriveReadError__AERENDER({
                    product,
                    processProps,
                    victorResult,
                });

            if (victorResult.statusCode !== 200){
                console.warn(`Second round victorResult.statusCode !== 200 so throwing victorResult.message: ${victorResult.message}`);
                throw victorResult.message;
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

            return victorResult;
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

            return {
                status: "error",
                statusCode: 500,
                message: nextMessage,
            };
        }
    } catch (e) {
        throw `${funcName}: ${e}`;
    } finally {
        // write systemBusy file
        !debugMode && fs.writeFileSync(systemBusyFilePath, "false");
    }
}
