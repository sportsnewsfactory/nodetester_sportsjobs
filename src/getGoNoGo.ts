type GoNoGoProps = {
    itemKeys: string[];
    item: {[key: string]: string}
}

/**
 * Validate the data
 * 
 * There can be items with null values, so we'll skip those
 * while all other cases will throw an error
 */
export function goNoGo({
    itemKeys, item
}: GoNoGoProps) {
    try {
        for (const key of itemKeys) {
            if (!(key in item)) throw `Key not found in news item: ${key}`;
            if (item[key] === null){
                throw `Ran into null key @ ${key}. Skipping.`;
            }
            if (item[key] === '' || !item[key] || item[key].length < 3){
                throw `Ran into empty key @ ${key}. Skipping.`;
            }
        }
    } catch (e) {
        throw new Error(`noGo: ${e}`);
    }
}