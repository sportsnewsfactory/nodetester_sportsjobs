import { CORE } from '../../../types/CORE';
import { process__AE_Daily_News__AERENDER } from './AERenderVersion/AE_Daily_News';
import { process__SNS_AE_News__AERENDER } from './AERenderVersion/SNS_AE_News';

export type GenericProcessProps = {
    SportsDB: any;
    BackofficeDB: any;
    brand: CORE.Brand;
    edition: CORE.Edition;
    product: CORE.Product;
    dbgLevel: number;
};

//@ts-ignore
export const EDIT: { [key in CORE.Keys.Product]: Function } = {
    AE_Daily_News: process__AE_Daily_News__AERENDER,
    SNS_AE_News: process__SNS_AE_News__AERENDER,
    // SNS_AE_Schedule: process__SNS_AE_Schedule,
    // SNS_AE_Ranking: process__SNS_AE_Ranking,
    // SNS_PS_Schedule: process__SNS_PS_Schedule,
    // SNS_PS_News: process__SNS_PS_News,
    // SNS_PS_Ranking: process__SNS_PS_Ranking,
    // SNS_PS_Scores: process__SNS_PS_Scores,
};
