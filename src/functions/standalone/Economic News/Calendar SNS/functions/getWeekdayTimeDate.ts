export type DateDataObj = {
    weekday: string, 
    time: string, 
    date: string
}

/**
 * @param date is of @type {string} MySQLDateTime. i.e. '2022-01-01 00:00:00'
 */
export function getWeekdayTimeDate(date: string): DateDataObj {
    const dateObj = new Date(date);
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const time = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return { weekday, time, date: dateStr };
}