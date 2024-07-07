export type Stat = {
    key: string,
    shortName: string,
    hirarchy: number,
}

export const standingsEntryDefs: Stat[] = [
    {key: 'points', shortName: 'PTS', hirarchy: 1},
    {key: 'wins', shortName: 'W', hirarchy: 2},
    {key: 'losses', shortName: 'L', hirarchy: 3},
    {key: 'draws', shortName: 'D', hirarchy: 4},
    {key: 'position', shortName: 'POS', hirarchy: 0},
    {key: 'team_name', shortName: 'TEAM', hirarchy: 0},
]