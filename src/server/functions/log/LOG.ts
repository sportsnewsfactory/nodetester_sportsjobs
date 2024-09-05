export const LOG = {
    message(message: string, color?: string){
        if (!color) console.log(message);
        else console.log(`%c${message}`, `color: ${color}`);
    },
}