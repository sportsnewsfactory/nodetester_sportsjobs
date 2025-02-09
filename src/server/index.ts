import getNextJob from './functions/get/nextJob';
import { CORE } from '../types/CORE';
import getEdition from './functions/get/edition';
import { MYSQL_DB } from '../classes/MYSQL_DB';
import getBrand from './functions/get/brand';
import getProduct from './functions/get/product';
import { GenericProcessProps, PROCESS } from './functions/process/PROCESS';
import { LOG } from './functions/log/LOG';
import getTimestamp from './functions/get/timestamp';
import recognizeError from './functions/error/recognize';
import handleGoogleDriveReadError from './functions/error/handleGoogleDriveRead';
import cleanup from './functions/cleanup';
import writeFinalLog from './functions/log/writeFinalLog';
import { AE } from '../types/AE';
import updateJob from './functions/db/updateJob';
import { TABLES } from '../config/TABLES';
import fs from 'fs';

export default async function SERVER_MAIN(){
    const funcName = `SERVER_MAIN`;
    
    // init log
    let log = '';
    let nextMessage = `${funcName} started @ ${getTimestamp()}`;
    log += nextMessage + '\n';
    LOG.message(nextMessage, 'gray');

    // init databases
    const SportsDB = new MYSQL_DB(); SportsDB.createPool('SPORTS');
    const BackofficeDB = new MYSQL_DB(); BackofficeDB.createPool('BACKOFFICE');

    // will be used to check if system is busy
    const systemBusyFilePath = `G:/My Drive/Sports/systemBusy.txt`;

    try {
        
        // create systemBusy file if it doesn't exist
        if (!fs.existsSync(systemBusyFilePath))
            fs.writeFileSync(systemBusyFilePath, 'false');
        
        // check if system is busy
        let systemBusy = fs.readFileSync(systemBusyFilePath).toString() === 'true';
        if (systemBusy){ 
            nextMessage = `System is busy`;
            LOG.message(nextMessage, 'yellow');
            log += nextMessage + '\n';
            return true;
        }

        const freshJobs: AE.Job[] = await SportsDB.SELECT(
            TABLES.jobs, {whereClause: { status: 'fresh' }}
        );

        if (freshJobs.length === 0){
            nextMessage = `No fresh jobs found`;
            LOG.message(nextMessage, 'yellow');
            log += nextMessage + '\n';
            return true;
        }

        for (const job of freshJobs){
            // write systemBusy file
            fs.writeFileSync(systemBusyFilePath, 'true');

            try {
                nextMessage = `Next job: ${job.brand_name} ${job.product_name} ${job.lang}`;
                log += nextMessage + '\n';
                LOG.message(nextMessage, 'pink');

                const edition: CORE.Edition = await getEdition(SportsDB, job);
                const brand: CORE.Brand = await getBrand(SportsDB, job.brand_name);
                const product: CORE.Product = await getProduct(SportsDB, job.product_name);
                
                // throw JSON.stringify(edition, null, 4);

                let processProps: GenericProcessProps = {
                    SportsDB, BackofficeDB, brand, edition, product, dbgLevel: 1
                };

                if (!(product.product_name in PROCESS)) throw `No process found for ${product.product_name}`;
                let result: string = await PROCESS[product.product_name](processProps);
                
                let potentialErrorName = recognizeError(result);
                
                // only in the event of a googleDriveRead error, we'll retry the process.
                if (potentialErrorName === 'googleDriveRead') result = await handleGoogleDriveReadError({product, processProps, result});
                
                potentialErrorName = recognizeError(result);

                // if there's an error that is not of the following types, throw the result.
                if (!(potentialErrorName === 'success' || potentialErrorName === 'empty' || potentialErrorName === 'context')){
                    // Let's try not updating the job status to error, so that we can retry the process.
                    // await updateJob({ SportsDB, nextJob, log, newStatus: 'error' });
                    throw result;
                }

                nextMessage = `Process completed successfully (${potentialErrorName})`;
                log += nextMessage + '\n';
                LOG.message(nextMessage, 'green');

                await updateJob({ SportsDB, nextJob: job, log, newStatus: 'processing' });
            } catch (e) {
                // handle error
                nextMessage = `${job.brand_name} ${job.lang} ${job.product_name} failed @ ${getTimestamp()} with error: ${e}`;
                log += nextMessage + '\n';
                LOG.message(nextMessage, 'red');
            }
        }
    } catch (e) {
        // handle error
        nextMessage = `${funcName} failed @ ${getTimestamp()} with error: ${e}`;
        log += nextMessage + '\n';
        LOG.message(nextMessage, 'red');
    } finally {
        // write systemBusy file
        fs.writeFileSync(systemBusyFilePath, 'false');
        await SportsDB.pool.end();
        await BackofficeDB.pool.end();
        await cleanup();
        writeFinalLog(log);
    }
}