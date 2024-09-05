export default function getTimestamp(options?: Intl.DateTimeFormatOptions): string {
    const dateSTR: string = new Date()
        .toLocaleDateString('en-GB', options ?? { 
            month: '2-digit', 
            day: '2-digit', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit', 
            calendar: 'gregory' }
        );
    return dateSTR;
}