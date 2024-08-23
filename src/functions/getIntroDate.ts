export function getIntroDate(dateFormat: string){
    try {
        const now = new Date();
        // target date is tomorrow if after 17:00
        const targetDate = now.getHours() > 17 ? new Date(now.getTime() + 24*60*60*1000) : now;

        const options = { day: '2-digit', month: 'short', year: 'numeric', calendar: 'gregory' } as Intl.DateTimeFormatOptions;
        const introDate = targetDate.toLocaleDateString(dateFormat, options);
        return {targetDate, introDate}
    } catch (e) {
        throw `getIntroDate: ${e}`;
    }
}