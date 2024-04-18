import { MYSQL_DB } from "../../classes/MYSQL_DB";
import { coreTables } from "../../constants/coreTables";
import { CORE } from "../../types/CORE";
import { DB } from "../../types/DB";

export async function getBrandEditionProduct(
    DB: MYSQL_DB, 
    brand_name: string, 
    product_name: string
): Promise<{brand: CORE.Brand, edition: CORE.Edition, product: CORE.Product}>{
    
    const brands = await DB.SELECT<CORE.Brand>(coreTables.brands);
    const brand: CORE.Brand | undefined = brands.find(brand => brand.brand_name === brand_name);
        if (!brand) throw `Brand not found: ${brand_name}`;

    const editions: CORE.Edition[] = await DB.SELECT<CORE.Edition>(coreTables.editions);
    const edition: CORE.Edition | undefined = editions.find(
        edition => edition.brand_name === brand_name && 
        edition.product_name === product_name
    );
        if (!edition) throw `Edition or product name in edition row not not found: ${brand_name} ${product_name}`;

    const products = await DB.SELECT<CORE.Product>(
        coreTables.products, 
        {whereClause: {product_name: edition.product_name}}
    );
        if (products.length === 0) throw `Product not found: ${edition.product_name}`;

    const product = products[0];
    return {brand, edition, product};
}   