export const LOG = {
    message(message: string, color?: string){
        if (!color) console.log(message);
        else console.log(`%c${message}`, `color: ${color}`);
    },
    consoleAndWrite(log: string, message: string, color?: string){
        if (!color) console.log(message);
        else console.log(`%c${message}`, `color: ${color}`);
        log += message + '\n';
    }
}