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
import { TABLES } from '../config/TABLES';
import { RowDataPacket } from 'mysql2';

export default async function SERVER_MAIN(){
    const funcName = `SERVER_MAIN`;
    LOG.message(`${funcName} started @ ${getTimestamp()}`, 'gray');

    const SportsDB = new MYSQL_DB(); SportsDB.createPool('SPORTS');
    const BackofficeDB = new MYSQL_DB(); BackofficeDB.createPool('BACKOFFICE');

    try {
        const systemBusy = false;
        const nextJob = await getNextJob(SportsDB, 'fresh');
        
        if (systemBusy) throw `System is busy`;
        if (!nextJob) throw `No job found`;

        LOG.message(`Next job: ${nextJob.brand_name} ${nextJob.product_name} ${nextJob.lang}`, 'pink');

        const edition: CORE.Edition = await getEdition(SportsDB, nextJob);
        const brand: CORE.Brand = await getBrand(SportsDB, nextJob.brand_name);
        const product: CORE.Product = await getProduct(SportsDB, nextJob.product_name);
        
        let processProps: GenericProcessProps = {
            SportsDB, BackofficeDB, brand, edition, product, dbgLevel: 1
        };

        if (!(product.product_name in PROCESS)) throw `No process found for ${product.product_name}`;
        let result: string = await PROCESS[product.product_name](processProps);
        
        let potentialErrorName = recognizeError(result);
        
        if (potentialErrorName === 'googleDriveRead') result = await handleGoogleDriveReadError({product, processProps, result});
        
        potentialErrorName = recognizeError(result);

        if (potentialErrorName === 'success' || potentialErrorName === 'empty' || potentialErrorName === 'context'){
            LOG.message(`Process completed successfully (${potentialErrorName})`, 'green');

            const updateSQL = `
                UPDATE ${TABLES.jobs}
                SET status = 'processing'
                WHERE brand_name = '${nextJob.brand_name}'
                AND product_name = '${nextJob.product_name}'
                AND lang = '${nextJob.lang}'
                AND status = 'fresh';
            `;

            const updateResult = await SportsDB.pool.execute(updateSQL);
            if ((updateResult[0] as RowDataPacket).affectedRows === 1){
                LOG.message(`Job status updated to 'processing'`, 'green');
            } else {
                throw `Job status not updated to 'processing'`;
            }
            return;
        }

        throw result;
    } catch (e) {
        // handle error
        console.warn(`${funcName}: ${e}`);
    } finally {
        await SportsDB.pool.end();
        await BackofficeDB.pool.end();
    }
    
}