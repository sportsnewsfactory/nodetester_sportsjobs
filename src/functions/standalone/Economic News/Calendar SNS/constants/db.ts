import { Calendar } from "../AE/CalendarTypes";

export const DBTitleMapping: {[key in Calendar.Item.DataSourceKeys]: string | null} = {
    title: 'title',
    definition: 'defenition',
    date: null,
    weekday: null,
    time: null,
    previous: 'previous',
    forecast: 'estimates',
}