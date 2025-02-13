import * as scan from '../utils/scan';

export type EditionType = 'noon' | 'evening';
export type DayName =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export const dayNames: DayName[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

type DualValue = { [key in EditionType]: number };

class Fdate {
    date: Date;
    formatted: string;

    constructor(date: Date) {
        this.date = date;
        this.formatted = formatDateTo_sixDigits(date);
    }
}

export class TimeDeltas {
    now: Date;
    startHour: DualValue;
    nowHour: number;
    nowEdition: EditionType;
    nowParsed: number;
    editionDate: Date;
    editionDateFormatted: string;
    nowDay: DayName;
    nowYear: number;
    tomorrowDay: DayName;
    tomorrowDate: Date;
    today: string;
    tomorrow: string;
    editionDateYYYYMMDD: string;
    editionDateMMMdd: string;
    editionDayName: string;
    introDate: string;
    editionDateYYYYMMDDhhmmss: string;
    nowYYYYMMDDhhmmss: string;

    constructor(customDate?: Date | null) {
        this.startHour = { noon: 11, evening: 23 };
        this.now = customDate || new Date();
        this.nowYYYYMMDDhhmmss = this.formatYYYYMMDDhhmmss(this.now);
        this.tomorrowDate = new Date(this.now);
        this.tomorrowDate.setDate(this.tomorrowDate.getDate() + 1);
        this.nowParsed = Date.parse(this.now.toString());
        this.nowHour = this.now.getHours();
        this.nowYear = this.now.getFullYear();
        this.nowEdition = this.getNowEdition();
        this.editionDate = this.getCurrentEditionDate();
        this.editionDateFormatted = this.formatToSixDigits(this.editionDate);
        this.nowDay = this.getDayName(this.now.getDay());
        this.tomorrowDay = this.getDayName(this.tomorrowDate.getDay());
        this.today = formatDateTo_sixDigits(this.now);
        this.tomorrow = formatDateTo_sixDigits(this.tomorrowDate);
        this.editionDateYYYYMMDD = this.formatYYYYMMDD(this.editionDate);
        this.editionDateYYYYMMDDhhmmss = this.formatYYYYMMDDhhmmss(
            this.editionDate
        );
        this.editionDateMMMdd = this.getProblematicNarrationFolderDate();
        this.editionDayName = this.getDayName(this.editionDate.getDay());
        this.introDate = this.editionDate.toLocaleDateString(`en-GB`, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            calendar: 'gregory',
        } as Intl.DateTimeFormatOptions);
    }

    getNowEdition(): EditionType {
        return this.nowHour >= this.startHour.noon &&
            this.nowHour < this.startHour.evening
            ? 'noon'
            : 'evening';
    }

    getCurrentEditionDate() {
        return this.nowEdition === 'noon' ||
            this.nowHour >= this.startHour.evening
            ? this.getTomorrow()
            : this.now;
    }

    getTomorrow() {
        return new Date(this.nowParsed + 24 * 60 * 60 * 1000);
    }

    formatToSixDigits(date: Date): string {
        const year = (date.getFullYear() - 2000).toString();
        const month = padZero(date.getMonth() + 1);
        const day = padZero(date.getDate());
        return `${day}${month}${year}`;
    }

    formatYYYYMMDD(date: Date): string {
        const year = date.getFullYear().toString();
        const month = padZero(date.getMonth() + 1);
        const day = padZero(date.getDate());
        return `${year}-${month}-${day}`;
    }

    formatYYYYMMDDhhmmss(date: Date): string {
        const year = date.getFullYear().toString();
        const month = padZero(date.getMonth() + 1);
        const day = padZero(date.getDate());
        const hours = padZero(date.getHours());
        const minutes = padZero(date.getMinutes());
        const seconds = padZero(date.getSeconds());
        return `${year}-${month}-${day} ${hours}-${minutes}-${seconds}`;
    }

    getDayName(dayNum: number): DayName {
        return dayNames[dayNum] || 'Unknown';
    }

    /**
     * The narration folder date format is MMM dd,
     * i.e. Jan 11, Feb 22, etc.
     */
    getProblematicNarrationFolderDate() {
        const month = this.now.toLocaleString('default', { month: 'short' });
        const day = padZero(this.editionDate.getDate());
        return `${month} ${day}`;
    }
}

function padZero(value: number): string {
    return value.toString().padStart(2, '0');
}

function formatDateTo_tenDigits(date: Date): string {
    const year = (date.getFullYear() - 2000).toString();
    const month = padZero(date.getMonth() + 1);
    const day = padZero(date.getDate());
    const hours = padZero(date.getHours());
    const minutes = padZero(date.getMinutes());
    return `${year}${month}${day} ${hours}:${minutes}`;
}

function formatDateTo_sixDigits(date: Date): string {
    const year = (date.getFullYear() - 2000).toString();
    const month = padZero(date.getMonth() + 1);
    const day = padZero(date.getDate());
    return `${day}${month}${year}`;
}

function convertToDate(dateFolderName: string, t: TimeDeltas): Date | null {
    const month = scan.forMonth(dateFolderName);
    const day = scan.forDay(dateFolderName);

    if (day > 0 && day <= 31 && month > -1) {
        return new Date(t.nowYear, month, day, t.nowHour, 0, 0, 0);
    }
    return null;
}

/**
 * Simplified version of convertToDate.
 * Doesn't require @type {TimeDeltas}.
 */
function convertToDateVer2(
    dateFolderName: string,
    nowYear: number,
    nowHour: number
): Date | null {
    const month = scan.forMonth(dateFolderName);
    const day = scan.forDay(dateFolderName);

    if (day > 0 && day <= 31 && month > -1) {
        return new Date(nowYear, month, day, nowHour, 0, 0, 0);
    }
    return null;
}

function addHoursToDate(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export {
    Fdate,
    formatDateTo_tenDigits,
    formatDateTo_sixDigits,
    convertToDate,
    addHoursToDate,
    convertToDateVer2,
};
