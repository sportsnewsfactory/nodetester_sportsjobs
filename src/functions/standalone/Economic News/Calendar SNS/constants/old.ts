import { Calendar } from "../AE/CalendarTypes";

export const OldKeyNameConvertion: {[key in Calendar.Item.DataSourceKeys]: string} = {
    title: 'Wname',
    definition: 'Wdescription',
    date: 'Wdate',
    weekday: 'Wday',
    time: 'Wtime',
    previous: 'Wprevious',
    forecast: 'Wforecast',
}