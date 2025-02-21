import { DB } from "../types/DB";

export const standingTextKeys: DB.Jobs.Mapping.StandingTextKey[] = [
    'team_name',
    // 'position',
    'wins',
    'losses',
];
export const itemTextKeys: DB.Jobs.Mapping.ItemTextKey[] = [
    'headline',
    'sub_headline',
];
export const itemFileKeys: DB.Jobs.Mapping.ItemFileKey[] = [
    'narration',
    'background',
    'logo',
];

export const mappingFuncs = {
    headline: (item: DB.Item.JoinedNews) => `Headline${item.id}`,
    sub_headline: (item: DB.Item.JoinedNews) =>
        `headlinetext${item.id}1`,
    team_name: (item: DB.Item.JoinedNews, standing: DB.StandingAug) =>
        `ranking-name-team${item.id}-${standing.position}`,
    // position: (item: DB.Item.JoinedNews, standing: DB.StandingAug) =>
    //     `ranking-stat1-team${item.id}-${standing.position}`,
    position: () => 'No need',
    wins: (item: DB.Item.JoinedNews, standing: DB.StandingAug) =>
        `ranking-stat1-team${item.id}-${standing.position}`,
    losses: (item: DB.Item.JoinedNews, standing: DB.StandingAug) =>
        `ranking-stat2-team${item.id}-${standing.position}`,
    narration: (item: DB.Item.JoinedNews) => `News-Narration${item.id}`,
    background: (item: DB.Item.JoinedNews) => `News-BG${item.id}`,
    logo: (item: DB.Item.JoinedNews) => `News-logo${item.id}`,
    presenter: (key: string) => (key.toLowerCase().includes('open') ? 'Presenteropen' : 'Presenterclose'),
    scheduleMatchDate: (itemNum: number, matchNum: number) => `game-date-${itemNum}-${matchNum}`,
    scheduleMatchTime: (itemNum: number, matchNum: number) => `game-time-${itemNum}-${matchNum}`,
    scheduleHomeTeam: (itemNum: number, matchNum: number) => `Schedule-home-team-${itemNum}-${matchNum}`,
    scheduleAwayTeam: (itemNum: number, matchNum: number) => `Schedule-away-team-${itemNum}-${matchNum}`,
};