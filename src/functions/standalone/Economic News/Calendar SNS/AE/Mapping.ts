import { Calendar } from "./CalendarTypes";

type DataSourceKeysWithoutForecast = Omit<Calendar.Item.DataSourceKeys, 'forecast'>;

export const OldKeyNameConvertion: {[key in DataSourceKeysWithoutForecast as string]: string} = {
    title: 'Wname',
    definition: 'Wdescription',
    date: 'Wdate',
    time: 'Wtime',
    previous: 'Wprevious',
}

export const NewKeyNameConvertion: {[key in Calendar.Item.DataSourceKeys]: string} = {
    title: 'txt-item-economic_calendar-title',
    definition: 'txt-item-economic_calendar-definition',
    date: 'txt-item-economic_calendar-date',
    time: 'txt-item-economic_calendar-time',
    previous: 'txt-item-economic_calendar-previous',
    forecast: 'txt-item-economic_calendar-forecast',
}

/**
 * Here we'll examine the given @param textLayerName
 * to see if it's in the old convention and if so
 * we'll convert it to the new convention
 * 
 * if the textLayerName is not in the old convention
 * we'll return null
 * 
 * This is written in ES3 syntax to be able to run in the
 * ExtendScript environment. So we're not using includes, startWith etc...
 */
export function convertOldKeyNameToNewKeyName<ItemNum extends number>(textLayerName: string, itemNum: ItemNum): Calendar.Item.NewConventionKey<ItemNum> | null {
    /** 
     * Firstly, let's see if the layer name has the 
     * specific item number @type {ItemNum}
     */
    if (textLayerName.indexOf(itemNum.toString()) === -1) return null;

    /**
     * Next, let's see if the layer name has any of the
     * values of @param OldKeyNameConvertion
     */
    for (const key in OldKeyNameConvertion) {
        if (textLayerName.indexOf(OldKeyNameConvertion[key]) !== -1) {
            return NewKeyNameConvertion[key as Calendar.Item.DataSourceKeys] as Calendar.Item.NewConventionKey<ItemNum>;
        }
    }

    return null;
}