export function getFormattedDate(){
    const now = new Date();
    const formattedMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const formattedDay = now.getDate().toString().padStart(2, '0');
    const formattedDate = `${now.getFullYear()}-${formattedMonth}-${formattedDay}`;
    return formattedDate;
}