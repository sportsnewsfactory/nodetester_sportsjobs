const tempMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function formatDateAndTime(
    start_time_timestamp: string | number
): {
    date: string, 
    time: string
} {
    // convert the mysql timestamp to a js date
    const jsDate = new Date(Number(start_time_timestamp) * 1000);
    let hours = jsDate.getHours();
    const minutes = jsDate.getMinutes();
    const formattedHours = hours > 12 ? hours -= 12 : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const AMPM = hours > 12 ? 'PM' : 'AM';
    const date = `${jsDate.getDate()} ${tempMonths[jsDate.getMonth() + 1]}`;
    const time = `${formattedHours}:${formattedMinutes} ${AMPM}`;
    console.log(`%c${start_time_timestamp} jsdate: ${jsDate} ${date} ${time}`, 'color: pink')
    return {date, time};
}