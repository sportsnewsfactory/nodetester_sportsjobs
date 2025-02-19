import fs from 'fs';

import { CORE } from '../types/CORE';
import { MYSQL_DB } from '../classes/MYSQL_DB';
import getProduct from './functions/get/product';
import { LOG } from './functions/log/LOG';
import getTimestamp from './functions/get/timestamp';
import { AE } from '../types/AE';
import { TABLES } from '../config/TABLES';
import { TimeDeltas } from '../V2/classes/TimeDeltas';
import { appendToLogFile } from '../V2/utils/appendToLog';
import identifyRenderMachine from '../functions/identifyRenderMachine';
import { editSingleFreshJob } from './functions/process/AERenderVersion/jobs/edit';
import { renderSingleEditedJob } from './functions/process/AERenderVersion/jobs/render';
import { S3Bucket } from '../V2/classes/AWS/S3Bucket';
import { BUCKETS } from '../config/BUCKETS';
import updateJob from './functions/db/updateJob';

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

        const goOverRenderedJobs = async () => {            
            const allJobs: AE.Job[] = await SportsDB.SELECT(TABLES.jobs);

            if (allJobs.length === 0){
                console.log(`No rendered jobs found`);
                return true;
            }

            const uniqueLangsSet = [...new Set(allJobs.map(job => job.lang))];
            const uniqueLangs = Array.from(uniqueLangsSet);

            for (const lang of uniqueLangs){
                /**
                 * If the given language has undergone QA (i.e is in either
                 * 'qa-ready' or 'uploaded' state) and there are more
                 * jobs in this language that are rendered, we need to upload all of them,
                 * including that which has undergone QA successfully,
                 * to the AWS bucket.
                 * 
                 * It's possible that there will be a job which has already been uploaded
                 * white another in the same language is still in rendered state or earlier.
                 */
                const aeDailyNewsQAReadyJob = allJobs.find(
                    (job: AE.Job) => job.lang === lang && 
                    job.product_name === 'AE_Daily_News' && 
                    (job.status === 'qa-ready' || job.status === 'uploaded') &&
                    (TD.formatYYYYMMDD(job.target_date)) === TD.editionDateYYYYMMDD);
                
                if (aeDailyNewsQAReadyJob){
                    console.log(`Job for lang ${lang} is in ${aeDailyNewsQAReadyJob.status} status`);
                    
                    /**
                     * Check if there are any more jobs in rendered state for the given language
                     * and targetDate, and if so, upload them to the AWS bucket.
                     */
                    console.log(`Checking for more jobs in rendered state for lang ${lang} and targetDate ${TD.editionDateYYYYMMDD}`);

                    const readyToBeUploadedJobs = allJobs.filter(
                        (job: AE.Job) => job.lang === lang &&
                        (job.status === 'rendered' || job.status === 'qa-ready') &&
                        (TD.formatYYYYMMDD(job.target_date)) === TD.editionDateYYYYMMDD
                    );

                    for (const qaReadyJob of readyToBeUploadedJobs){
                        const product: CORE.Product = await getProduct(SportsDB, qaReadyJob.product_name);
                
                        const brandPath = `Z:/Studio/Sports/S_Brands/${qaReadyJob.brand_name}/`;
                        const productFolder = product.product_path.replace('$brand_path', brandPath);
                        const exportsFolder = `${productFolder}exports/`
                        const expectedExportPath = `${exportsFolder}${qaReadyJob.brand_name} ${qaReadyJob.lang} ${TD.editionDateYYYYMMDD}.mp4`;

                        if (fs.existsSync(expectedExportPath)){
                            console.log(`Export found at ${expectedExportPath}`);
                            
                            const clientUploadPath = `UPLOADS/${qaReadyJob.brand_name}/${qaReadyJob.lang}/${product.aws_folder_name}/${TD.editionDateYYYYMMDD}/video.mp4`;
                            
                            const bucket = new S3Bucket(BUCKETS.sportsOutgoingMedia, 'WOF');
                            const stream: fs.ReadStream = fs.createReadStream(expectedExportPath);
                            const uploadResult: string = await bucket.uploadStream(clientUploadPath, stream, 'video/mp4');
                            
                            console.log(`%cuploadResult: ${uploadResult}`, 'color: yellow');

                            const newStatus: CORE.Keys.JobStatus = 'uploaded';

                            // await SportsDB.UPDATE(TABLES.jobs, 
                            //     { status: newStatus},
                            //     { 
                            //         status: qaReadyJob.status, 
                            //         brand_name: qaReadyJob.brand_name, 
                            //         lang: qaReadyJob.lang, 
                            //         product_name: qaReadyJob.product_name 
                            //     }
                            // );
                            await updateJob({ SportsDB, nextJob: qaReadyJob, log: '', newStatus, prevStatus: qaReadyJob.status });
                        } else {
                            console.warn(`Export not found at ${expectedExportPath}`);
                            continue;
                        }
                    }

                    continue;
                } 

                /**
                 * If the language in question is waiting for QA,
                 * we skip it.
                 */
                const aeDailyNewsQAPendingJob = allJobs.find(
                    (job: AE.Job) => job.lang === lang && 
                    job.product_name === 'AE_Daily_News' && 
                    (job.status === 'qa-pending') &&
                    (TD.formatYYYYMMDD(job.target_date)) === TD.editionDateYYYYMMDD);
                
                if (aeDailyNewsQAPendingJob){
                    console.log(`Job for lang ${lang} is in ${aeDailyNewsQAPendingJob.status} status`);
                    continue;
                }

                /**
                 * The language in question has no jobs in QA-ready or QA-pending status.
                 * We'll check if there are any jobs in rendered state for the given language,
                 * targetDate and AE_Daily_News jobType, and if so, upload them to the AWS bucket QA path.
                 */
                const aeDailyNewsLangJobs = allJobs.filter(
                    (job: AE.Job) => job.lang === lang && 
                    job.product_name === 'AE_Daily_News' && 
                    job.status === 'rendered' &&
                    (TD.formatYYYYMMDD(job.target_date)) === TD.editionDateYYYYMMDD
                );

                if (aeDailyNewsLangJobs.length === 0){
                    console.log(`No job in rendered state found for AE_Daily_News ${lang} targetDate: ${TD.editionDateYYYYMMDD}`);
                    continue;
                }

                /**
                 * Whether there's one or more jobs in rendered state for AE_Daily_News
                 * in the given language and targetDate, we'll take the first one.
                 */
                const firstJob = aeDailyNewsLangJobs[0];

                const product: CORE.Product = await getProduct(SportsDB, firstJob.product_name);
                
                const brandPath = `Z:/Studio/Sports/S_Brands/${firstJob.brand_name}/`;
                const productFolder = product.product_path.replace('$brand_path', brandPath);
                const exportsFolder = `${productFolder}exports/`
                const expectedExportPath = `${exportsFolder}${firstJob.brand_name} ${firstJob.lang} ${TD.editionDateYYYYMMDD}.mp4`;

                if (fs.existsSync(expectedExportPath)){
                    console.log(`Export found at ${expectedExportPath}`);
                    
                    const qaUploadPath = `QA/${firstJob.lang}/${TD.editionDateYYYYMMDD}.mp4`;
                    
                    const bucket = new S3Bucket(BUCKETS.sportsOutgoingMedia, 'WOF');
                    const stream: fs.ReadStream = fs.createReadStream(expectedExportPath);
                    const uploadResult: string = await bucket.uploadStream(qaUploadPath, stream, 'video/mp4');
                    
                    console.log(`%cuploadResult: ${uploadResult}`, 'color: yellow');

                    const newStatus: CORE.Keys.JobStatus = 'qa-pending';

                    // await SportsDB.UPDATE(TABLES.jobs, 
                    //     { status: newStatus}, 
                    //     {
                    //         status: firstJob.status, 
                    //         brand_name: firstJob.brand_name, 
                    //         lang: firstJob.lang, 
                    //         product_name: firstJob.product_name 
                    //     }
                    // );
                    await updateJob({ SportsDB, nextJob: firstJob, log: '', newStatus, prevStatus: firstJob.status });
                } else {
                    console.warn(`Export not found at ${expectedExportPath}`);
                    continue;
                }
            }

        };

        await goOverRenderedJobs();
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
    if (!fs.existsSync(systemBusyFilePath)){
        console.log(`Creating systemBusy file at ${systemBusyFilePath}`);
        fs.writeFileSync(systemBusyFilePath, 'false');
    }

    let systemBusy = fs.readFileSync(systemBusyFilePath).toString() === 'true';
    if (systemBusy) throw `System is busy`;
}