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

export default async function SERVER_MAIN(){
    const funcName = `SERVER_MAIN`;
    
    // init log
    let log = '';
    let nextMessage = `${funcName} started @ ${getTimestamp()}`;
    LOG.consoleAndWrite(log, nextMessage, 'gray');

    // init databases
    const SportsDB = new MYSQL_DB(); SportsDB.createPool('SPORTS');
    const BackofficeDB = new MYSQL_DB(); BackofficeDB.createPool('BACKOFFICE');

    try {
        // will be used to check if system is busy
        const systemBusy = false;
        if (systemBusy){ LOG.consoleAndWrite(log, `System is busy`, 'yellow'); return true; }

        const nextJob: AE.Job | null = await getNextJob(SportsDB, 'fresh');
        if (!nextJob){ LOG.consoleAndWrite(log, `No fresh jobs found`, 'yellow'); return true; }

        nextMessage = `Next job: ${nextJob.brand_name} ${nextJob.product_name} ${nextJob.lang}`;
        LOG.consoleAndWrite(log, nextMessage, 'pink');

        const edition: CORE.Edition = await getEdition(SportsDB, nextJob);
        const brand: CORE.Brand = await getBrand(SportsDB, nextJob.brand_name);
        const product: CORE.Product = await getProduct(SportsDB, nextJob.product_name);
        
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
            await updateJob({ SportsDB, nextJob, log, newStatus: 'error' });
            throw result;
        }

        nextMessage = `Process completed successfully (${potentialErrorName})`;
        LOG.consoleAndWrite(log, nextMessage, 'green');

        await updateJob({ SportsDB, nextJob, log, newStatus: 'processing' });
    } catch (e) {
        // handle error
        nextMessage = `${funcName} failed @ ${getTimestamp()} with error: ${e}`;
        LOG.consoleAndWrite(log, nextMessage, 'red');
    } finally {
        await SportsDB.pool.end();
        await BackofficeDB.pool.end();
        
        writeFinalLog(log);
        await cleanup();
    }
}