import { MYSQL_DB } from "../../../classes/MYSQL_DB";
import { coreTables } from "../../../constants/coreTables";
import { CORE } from "../../../types/CORE";

export default async function getProduct(DB: MYSQL_DB, product_name: string): Promise<CORE.Product> {
    const funcName = 'getProduct';
    try {
        const products = await DB.SELECT<CORE.Product>(
            coreTables.products, 
            {whereClause: {product_name}}
        );
        if (products.length === 0) throw `Product not found: ${product_name}`;

    const product = products[0];
    return product;
    } catch (e) {
        throw `${funcName}: ${e}`;
    }
}




