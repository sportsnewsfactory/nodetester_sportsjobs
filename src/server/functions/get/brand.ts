import { MYSQL_DB } from "../../../classes/MYSQL_DB";
import { coreTables } from "../../../constants/coreTables";
import { CORE } from "../../../types/CORE";

export default async function getBrand(DB: MYSQL_DB, brand_name: string): Promise<CORE.Brand> {
    const funcName = 'getBrand';
    try {
        const brands = await DB.SELECT<CORE.Brand>(
            coreTables.brands, 
            {whereClause: {brand_name}}
        );
        if (brands.length === 0) throw `Brand not found: ${brand_name}`;

    const brand = brands[0];
    return brand;
    } catch (e) {
        throw `${funcName}: ${e}`;
    }
}




