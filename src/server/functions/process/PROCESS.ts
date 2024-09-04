import { CORE } from "../../../types/CORE";
import { process__AE_Daily_News } from "./product/AE_Daily_News";
import { process__SNS_AE_News } from "./product/SNS_AE_News";

export type GenericProcessProps = {
    SportsDB: any,
    BackofficeDB: any,
    brand: CORE.Brand,
    edition: CORE.Edition,
    product: CORE.Product,
    dbgLevel: number,
};

//@ts-ignore
export const PROCESS: {[key in CORE.Keys.Product]: Function} = {
    AE_Daily_News: process__AE_Daily_News,
    SNS_AE_News: process__SNS_AE_News,
    // SNS_AE_Schedule: process__SNS_AE_Schedule,
    // SNS_AE_Ranking: process__SNS_AE_Ranking,
    // SNS_PS_Schedule: process__SNS_PS_Schedule,
    // SNS_PS_News: process__SNS_PS_News,
    // SNS_PS_Ranking: process__SNS_PS_Ranking,
    // SNS_PS_Scores: process__SNS_PS_Scores,
};