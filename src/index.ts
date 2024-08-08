/**
 * Here we'll convert data from the DB to a Json.Payload object
 */

import fs from 'fs';
import axios from 'axios';

import { MYSQL_DB } from './classes/MYSQL_DB';
import { GENERALNEWS } from './functions/GENERALNEWS';
import { STANDINGS } from './functions/STANDINGS';
import identifyRenderMachine from './functions/identifyRenderMachine';
import { AE } from './types/AE';
import { DB } from './types/DB';
import { EDITIONS } from './functions/EDITIONS';
import { FOLDERS } from './functions/FOLDERS';
import { PATHS } from './functions/PATHS';
import { itemTextKeys, mappingFuncs, itemFileKeys, standingTextKeys } from './functions/MAPPING';
import { PRESENTERSCHEMES } from './functions/PRESENTERSCHEMES';
import { getPresenterSchemeFiles } from './functions/Presenters';
import { NEXTMATCHES } from './functions/NEXTMATCHES';
import { CORE } from './types/CORE';
import { coreTables } from './constants/coreTables';
import { getBrandEditionProduct } from './functions/helper/getBrandEditionProduct';
import { buildAbsoluteSubfolderStructure__AE } from './functions/helper/buildAbsoluteSubfolderStructure';
import path from 'path';
import { getFormattedDate } from './functions/helper/getFormattedDate';
import { testCalendarSNSAE } from './functions/standalone/Economic News/Calendar SNS/test';
import { Fortuna_SNS_AE_Ranking__CORE } from './fortuna_AESNSRanking';
import { getExpectedVariables__AE } from './getExpectedVariables__AE';
import { getBackgrounds__AE } from './getBackgrounds__AE';
import { goNoGo } from './getGoNoGo';
import { Fortuna_AE_daily_news__CORE } from './fortuna_AEdailyNews';
import { Race2Real_AE_daily_news } from './functions/R2R/race2real_AEdailyNews HI TRANS';
import { Race2Real_AE_daily_news__MOTORSPORT_EN } from './functions/R2R/race2real_AEdailyNews EN MOTORSPORT';
import { CWINZ_AE_daily_news__MIXED_EN } from './functions/R2R/CWINZ_AEDailyNews EN MixedSports';

Race2Real_AE_daily_news__MOTORSPORT_EN();
// CWINZ_AE_daily_news__MIXED_EN();