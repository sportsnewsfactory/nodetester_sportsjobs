import { CORE } from '../../../types/CORE';
import { LOG } from '../log/LOG';
import { GenericProcessProps, PROCESS } from '../process/PROCESS';

type GoogleDriveReadErrorProps = {
    product: CORE.Product;
    processProps: GenericProcessProps;
    result: string;
};

export default async function handleGoogleDriveReadError({
    product,
    processProps,
    result,
}: GoogleDriveReadErrorProps): Promise<string> {
    LOG.message(
        `recognized googleDriveRead error. Deleting import folder content.`,
        'orange'
    );
    result = await PROCESS[product.product_name]({
        ...processProps,
        dbgLevel: -300,
    });
    if (!result.includes('importBin emptied'))
        throw `Failed to empty importBin:\n\n${result}`;
    LOG.message(`importBin emptied. Retrying process.`, 'yellow');
    result = await PROCESS[product.product_name]({
        ...processProps,
        dbgLevel: -1,
    });
    return result;
}
