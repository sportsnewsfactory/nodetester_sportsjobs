import fs from "fs";
import { MYSQL_DB } from "../../../../../classes/MYSQL_DB";
import { coreTables } from "../../../../../constants/coreTables";
import identifyRenderMachine from "../../../../../functions/identifyRenderMachine";
import { PATHS } from "../../../../../functions/PATHS";
import { getGeneralPaths } from "../../../../../functions/R2R/components/getGeneralPaths";
import { getSubfolderStrucure } from "../../../../../functions/R2R/components/getSubfolderStructure";
import { AE } from "../../../../../types/AE";
import { CORE } from "../../../../../types/CORE";
import { Paths } from "../../../../../types/CORE/Paths";
import { DB } from "../../../../../types/DB";
import { AERender } from "../../../../../V2/classes/AERender";
import { TimeDeltas } from "../../../../../V2/classes/TimeDeltas";
import { getAERenderPath } from "../../../../../V2/config/constants/getAERenderPath";
import { appendToLogFile } from "../../../../../V2/utils/appendToLog";
import updateJob from "../../../db/updateJob";
import getBrand from "../../../get/brand";
import getEdition from "../../../get/edition";
import getProduct from "../../../get/product";

const systemBusyFilePath = `G:/My Drive/Sports/systemBusy.txt`;

export async function renderSingleEditedJob(
    RM: DB.RenderMachine,
    TD: TimeDeltas,
    job: AE.Job,
    SportsDB: MYSQL_DB,
    BackofficeDB: MYSQL_DB,
    logFileName: string,
    debugMode: boolean = false
) {
    const funcName = `renderSingleEditedJob`;

    try {
        // write systemBusy file
        !debugMode && fs.writeFileSync(systemBusyFilePath, "true");

        // write the initial log message into a new log file
        appendToLogFile(
            TD,
            `${funcName}: renderSingleEditedJob started${
                debugMode ? " in debug mode" : ""
            }`,
            logFileName,
            true,
            "pink"
        );

        const aeRenderPath = getAERenderPath();

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
        const renderMachine: DB.RenderMachine = await identifyRenderMachine(
            SportsDB
        );

        const generalFolderPaths: Paths.GeneralFolders = await getGeneralPaths(
            renderMachine,
            SportsDB
        );

        /**
         * get the buleprint of the subfolder structure for the given product.
         */
        let productSubfolders: CORE.AE.ProductSubFolder[] =
            await SportsDB.SELECT(coreTables.product_subfolders, {
                whereClause: { product_name: edition.product_name },
            });

        const subFolders = getSubfolderStrucure(
            productSubfolders,
            renderMachine,
            edition,
            brand,
            product,
            generalFolderPaths
        );

        const timeLimit = 5000;

        const abortController = new AbortController();

        /**
         * Now we take @param paths.projectSaveFile and generate
         * @param paths.exportFile
         */
        const paths: AE.Json.AbsolutePath.Obj = PATHS.getAll__CORE(
            subFolders,
            edition
        );

        /**
         * Let's get the file name and export folder path
         * from @param paths.exportFile
         */
        const cleanedExportFilePath = paths.exportFile.replace(/\\/g, "/");
        const splitExportFilePath = cleanedExportFilePath.split("/");
        const exportFileName = splitExportFilePath.pop();
        const exportFolderPath = splitExportFilePath.join("/");

        if (!exportFileName) throw `No export file name found`;
        if (!exportFolderPath) throw `No export folder path found`;

        const renderCompName = `0_Main comp_AERender`;

        const aeRender = new AERender(
            TD,
            logFileName,
            aeRenderPath,
            paths.projectSaveFile,
            exportFolderPath,
            exportFileName,
            renderCompName,
            timeLimit,
            abortController
        );

        try {
            await aeRender.execPromiseInstance;

            const nextMessage = `Render completed successfully`;
            appendToLogFile(TD, nextMessage, logFileName, true, "green");

            const updateReslult = await updateJob({
                SportsDB,
                nextJob: job,
                newStatus: "rendered",
                dateString: TD.editionDateYYYYMMDD,
            });

            appendToLogFile(
                TD,
                `Job updated to rendered: ${updateReslult}`,
                logFileName,
                true,
                updateReslult ? "green" : "red"
            );
        } catch (error) {
            if ((error as Error).name === "AbortError") {
                console.warn(
                    'Render process aborted. error.name === "AbortError"'
                );
                appendToLogFile(
                    TD,
                    'Render process aborted. error.name === "AbortError"',
                    logFileName
                );
            } else {
                console.error("Render process failed:", error);
                appendToLogFile(
                    TD,
                    `Render process failed: ${(error as Error).message}`,
                    logFileName
                );
            }
        }
    } catch (e) {
        const errorMessage = `Caught Error: ${e}`;
        console.warn(errorMessage);
        appendToLogFile(TD, errorMessage, logFileName);
    } finally {
        // write systemBusy file
        !debugMode && fs.writeFileSync(systemBusyFilePath, "false");
    }
}
