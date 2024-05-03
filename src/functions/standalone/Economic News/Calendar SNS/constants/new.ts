import { Calendar } from "../AE/CalendarTypes";

export const NewKeyNameConvertion: {[key in Calendar.Item.DataSourceKeys]: string} = {
    title: 'txt-item-economic_calendar-title',
    definition: 'txt-item-economic_calendar-definition',
    date: 'txt-item-economic_calendar-date',
    weekday: 'txt-item-economic_calendar-weekday',
    time: 'txt-item-economic_calendar-time',
    previous: 'txt-item-economic_calendar-previous',
    forecast: 'txt-item-economic_calendar-forecast',
}