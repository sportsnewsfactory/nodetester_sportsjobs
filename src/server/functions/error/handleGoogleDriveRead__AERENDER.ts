import { CORE } from '../../../types/CORE';
import { LOG } from '../log/LOG';
import { VictorResult } from '../process/AERenderVersion/processVictorResult';
import { EDIT, GenericProcessProps } from '../process/EDIT';

type GoogleDriveReadErrorProps = {
    product: CORE.Product;
    processProps: GenericProcessProps;
    victorResult: VictorResult;
};

export default async function handleGoogleDriveReadError__AERENDER({
    product,
    processProps,
    victorResult,
}: GoogleDriveReadErrorProps): Promise<VictorResult> {
    LOG.message(
        `recognized googleDriveRead error. Deleting import folder content.`,
        'orange'
    );
    victorResult = await EDIT[product.product_name]({
        ...processProps,
        dbgLevel: -300,
    });
    if (
        victorResult.message &&
        !victorResult.message.includes('importBin emptied')
    )
        throw `Failed to empty importBin:\n\n${victorResult.message}`;
    LOG.message(`importBin emptied. Retrying process.`, 'yellow');
    victorResult = await EDIT[product.product_name]({
        ...processProps,
        dbgLevel: -1,
    });
    return victorResult;
}
