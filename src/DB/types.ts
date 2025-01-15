export type TransNewsItem = {
    lang: 'AR' | 'EN' | 'HI';
    item_id: string;
    headline: string;
    sub_headline: string;
    narration: string;
    file_name: string;
    when_created: string; // MYSQL timestamp
}