import * as dotenv from "dotenv";
dotenv.config();
import TelegramBot from "node-telegram-bot-api";

/**
 * log out the chatIds of the groups
 * that the bot is a member of
 */
export default async function sendTelegramMessage(
    message: string,
    chatId: string = "-4532633993"
) {
    /*
    const CHAT_IDS: { id: string; title: string }[] = [
        { id: '-4513937167', title: 'Vicki' },
        { id: '-4522103346', title: 'VF Empire' },
        { id: '-4538326316', title: "Who's on my PC ?!?!?! :o" },
        { id: '-4524262021', title: 'News Factory Sports' },
        { id: '-1002491896643', title: 'NewsFactory Noon' },
        { id: '-688958529', title: 'News Factory Finance' },
    ];
    */

    try {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) throw new Error("Bot token not found");

        const bot = new TelegramBot(token);

        // Send message to chatId
        await bot.sendMessage(chatId, message);
    } catch (e) {
        throw `Error in listChatIds: ${e}`;
    }
}
