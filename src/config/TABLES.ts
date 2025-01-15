export const TABLES = {
    editions: `config.CORE_L3_editions`,
    jobs: `config.RAPID_L4_jobs`,
}

export type Sport = 'Basketball' | 'Cricket' | 'Misc' | 'Tennis' | 'Football';
export type TransNewsTable<T extends Sport> = `${T}.RAPID__TRANS_NEWS`;

export const TransNewsTables: {[key in Sport]: TransNewsTable<key>} = {
    Basketball: 'Basketball.RAPID__TRANS_NEWS',
    Cricket: 'Cricket.RAPID__TRANS_NEWS',
    Misc: 'Misc.RAPID__TRANS_NEWS',
    Tennis: 'Tennis.RAPID__TRANS_NEWS',
    Football: 'Football.RAPID__TRANS_NEWS'
}
