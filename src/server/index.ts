import getNextJob from './functions/get/nextJob';
import { CORE } from '../types/CORE';
import getEdition from './functions/get/edition';
import { MYSQL_DB } from '../classes/MYSQL_DB';
import getBrand from './functions/get/brand';
import getProduct from './functions/get/product';
import { GenericProcessProps, PROCESS } from './functions/process/PROCESS';

export async function MAIN(){
    console.log(`This runs every minute ${new Date()}`);
    
    const SportsDB = new MYSQL_DB();
    SportsDB.createPool('SPORTS');

    const BackofficeDB = new MYSQL_DB();
    BackofficeDB.createPool('BACKOFFICE');

    try {
        const systemBusy = false;
        const nextJob = await getNextJob(SportsDB);
        if (systemBusy || !nextJob) return;
        const edition: CORE.Edition = await getEdition(SportsDB, nextJob);
        const brand: CORE.Brand = await getBrand(SportsDB, nextJob.brand_name);
        const product: CORE.Product = await getProduct(SportsDB, nextJob.product_name);
        
        let processProps: GenericProcessProps = {
            SportsDB, BackofficeDB, brand, edition, product, dbgLevel: 1
        };

        if (!(product.product_name in PROCESS)) throw `No process found for ${product.product_name}`;
        let result: string = await PROCESS[product.product_name](processProps);
        
        console.log(`First attempt: ${result}`);

        if (result.indexOf('Null is not an object') > -1){
            console.log(`Going for second attempt`);
            result = await PROCESS[product.product_name]({...processProps, dbgLevel: -3});
        }
        console.log(`MAIN: ${result}`);

    } catch (e) {
        console.warn(`MAIN: ${e}`);
    } finally {
        await SportsDB.pool.end();
        await BackofficeDB.pool.end();
    }
    
}