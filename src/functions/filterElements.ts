import { Template } from "../types/CORE/Template";

export function filterElements(
    objectElements: Template.Obj.Element[],
    elementBluePrints: Template.Element.DB_Blueprint[]
){
    const newsItemElements: Template.Element.DB_Blueprint[] = 
        objectElements
            .filter(e => e.object_name === 'news-item')
            .map(e => elementBluePrints.find(b => b.element_name === e.element_name) as Template.Element.DB_Blueprint);

    const standingsElements: Template.Element.DB_Blueprint[] = 
        objectElements
            .filter(e => e.object_name === 'standings-entry')
            .map(e => elementBluePrints.find(b => b.element_name === e.element_name) as Template.Element.DB_Blueprint);

    const scheduleElements: Template.Element.DB_Blueprint[] =
        objectElements
            .filter(e => e.object_name === 'schedule-entry')
            .map(e => elementBluePrints.find(b => b.element_name === e.element_name) as Template.Element.DB_Blueprint);

    return {
        newsItemElements,
        standingsElements,
        scheduleElements
    };
}