import { DB } from '../types/DB';

export type DB_NAME = DB.SportName | 'config' | 'GeneralNews';

export const DB_NAMES: { [key in DB_NAME]: DB_NAME } = {
    config: 'config',
    Football: 'Football',
    Basketball: 'Basketball',
    Baseball: 'Baseball',
    Cricket: 'Cricket',
    Motorsport: 'Motorsport',
    Tennis: 'Tennis',
    GeneralNews: 'GeneralNews',
    Misc: 'Misc',
};

export const TABLE_NAMES: { [key in DB_NAME]: { [key: string]: string } } = {
    config: {
        admins: `${DB_NAMES.config}.admins`,
        sports: `${DB_NAMES.config}.CORE_L1_sports`,
        langs: `${DB_NAMES.config}.CORE_L1_langs`
    },
    Football: {
        newsItemsRaw: `${DB_NAMES.Football}.NEWS_ITEMS_RAW`,
        searchPhrases: `${DB_NAMES.Football}.NEWS_CONFIG_search_phrases`,
        newsItemsSummarized: `${DB_NAMES.Football}.NEWS_ITEMS_SUMMARIZED`,
        backgroundBank: `${DB_NAMES.Football}.BANK_Backgrounds`,
        logoBank: `${DB_NAMES.Football}.BANK_Logos`,
        CORE__categories: `${DB_NAMES.Football}.CORE__CATEGORIES`,
        // CORE__tournaments: `${DB_NAMES.Football}.CORE__LEAGUESEASONS`,
        CORE__leagueSeasons: `${DB_NAMES.Football}.CORE__LEAGUESEASONS`,
    },
    Basketball: {},
    Baseball: {
        newArticlesRaw: `${DB_NAMES.Baseball}.news_articles_raw`,
    },
    Cricket: {
        newsItemsRaw: `${DB_NAMES.Cricket}.NEWS_ITEMS_RAW`,
        searchPhrases: `${DB_NAMES.Cricket}.NEWS_CONFIG_search_phrases`,
        newsItemsSummarized: `${DB_NAMES.Cricket}.NEWS_ITEMS_SUMMARIZED`,
        backgroundBank: `${DB_NAMES.Cricket}.BANK_Backgrounds`,
        logoBank: `${DB_NAMES.Cricket}.BANK_Logos`,
        newsItemsTranslated: `${DB_NAMES.Cricket}.NEWS_ITEMS_TRANSLATED`,
        shells: `${DB_NAMES.Cricket}.SHELLS`,
        teams: `${DB_NAMES.Cricket}.TEAMS`,
    },
    Motorsport: {},
    Tennis: {},
    GeneralNews: {},
    Misc: {}
};

export const NAMES = {
    cricketNewsItemsRaw: `${DB_NAMES.Cricket}.NEWS_ITEMS_RAW`,
    cricketSearchPhrases: `${DB_NAMES.Cricket}.NEWS_CONFIG_search_phrases`,
    cricketNewsItemsSummarized: `${DB_NAMES.Cricket}.NEWS_ITEMS_SUMMARIZED`,
    cricketBackgroundBank: `${DB_NAMES.Cricket}.BANK_Backgrounds`,
    cricketLogoBank: `${DB_NAMES.Cricket}.BANK_Logos`,
    cricketNewsItemsTranslated: `${DB_NAMES.Cricket}.NEWS_ITEMS_TRANSLATED`,
    cricketShells: `${DB_NAMES.Cricket}.SHELLS`,
    cricketTeams: `${DB_NAMES.Cricket}.TEAMS`,
    cricketLangs: `${DB_NAMES.Cricket}.LANGS`,

    footballNewsItemsRaw: `${DB_NAMES.Football}.NEWS_ITEMS_RAW`,
    footballSearchPhrases: `${DB_NAMES.Football}.NEWS_CONFIG_search_phrases`,
    footballNewsItemsSummarized: `${DB_NAMES.Football}.NEWS_ITEMS_SUMMARIZED`,
    footballBackgroundBank: `${DB_NAMES.Football}.BANK_Backgrounds`,
    footballLogoBank: `${DB_NAMES.Football}.BANK_Logos`,
    footballNewsItemsTranslated: `${DB_NAMES.Football}.NEWS_ITEMS_TRANSLATED`,
    footballShells: `${DB_NAMES.Football}.SHELLS`,
    footballTeams: `${DB_NAMES.Football}.TEAMS`,
    footballCategories: `${DB_NAMES.Football}.CORE__CATEGORIES`,
    footballLeagueSeasons: `${DB_NAMES.Football}.CORE__LEAGUESEASONS`,

    admins: `${DB_NAMES.config}.admins`,
    editions: `${DB_NAMES.config}.editions`,
    folders: `${DB_NAMES.config}.folders`,
    presenterSchemes: `${DB_NAMES.config}.presenterSchemes`,

    general_folders: `${DB_NAMES.config}.CORE_L2_general_folders`,
    core_editions: `${DB_NAMES.config}.CORE_L3_editions`,
};
