import TelegramBot from 'node-telegram-bot-api';
import { TelegramService } from './telegram.service';

type ValentineState =
    | { receiverId: string }
    | { mode: 'SEARCH_MY_VALENTINES' };

export class TelegramHandlers {
    private readonly state = new Map<string, ValentineState>();

    constructor(
        private readonly bot: TelegramBot,
        private readonly telegramService: TelegramService,
    ) { }

    register() {
        this.registerStart();
        this.registerCallbacks();
        this.registerMessages();
    }

    private registerStart() {
        this.bot.onText(/\/start/, async (msg) => {
            if (!msg.from) return;

            const user = await this.telegramService.getOrCreateUser(msg.from);

            await this.bot.sendMessage(
                msg.chat.id,
                `💌 Привет, ${user.firstName}! Добро пожаловать в анонимные валентинки команды Coins Game 😀`,
                this.mainMenu(),
            );
        });
    }

    private registerCallbacks() {
        this.bot.on('callback_query', async (query) => {
            if (!query.message || !query.data || !query.from) return;

            const chatId = query.message.chat.id;
            const telegramId = query.from.id.toString();

            const user = await this.telegramService.getOrCreateUser(query.from);

            if (query.data.startsWith('SELECT_RECEIVER:')) {
                const receiverId = query.data.split(':')[1];

                this.state.set(telegramId, { receiverId });

                await this.bot.sendMessage(chatId, '✍️ Напиши текст валентинки');
                await this.bot.answerCallbackQuery(query.id);
                return;
            }

            switch (query.data) {
                case 'SEND_VALENTINE': {
                    const users = await this.telegramService.getOtherUsers(telegramId);

                    if (users.length === 0) {
                        await this.bot.sendMessage(chatId, 'Пока нет других пользователей 😢');
                        break;
                    }

                    await this.bot.sendMessage(chatId, 'Выбери получателя 💖', {
                        reply_markup: {
                            inline_keyboard: users.map((u) => [
                                {
                                    text: u.firstName,
                                    callback_data: `SELECT_RECEIVER:${u.id}`,
                                },
                            ]),
                        },
                    });
                    break;
                }

                case 'MY_VALENTINES': {
                    const valentines = await this.telegramService.getMyValentines(user.id);

                    if (valentines.length === 0) {
                        await this.bot.sendMessage(
                            chatId,
                            '📥 У тебя пока нет валентинок 💔'
                        );
                        break;
                    }

                    for (const v of valentines) {
                        const caption =
                            `💌 Анонимная валентинка\n` +
                            `🕒 ${v.createdAt.toLocaleString()}\n\n` +
                            (v.message || '');

                        if (v.photoFileId) {
                            await this.bot.sendPhoto(
                                chatId,
                                v.photoFileId,
                                { caption }
                            );
                        } else {
                            await this.bot.sendMessage(
                                chatId,
                                caption
                            );
                        }
                    }

                    await this.bot.sendMessage(
                        chatId,
                        'Что дальше?',
                        {
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔍 Поиск', callback_data: 'SEARCH_MY_VALENTINES' }],
                                    [{ text: '⬅️ Назад', callback_data: 'BACK_TO_MENU' }],
                                ],
                            },
                        },
                    );

                    break;
                }


                case 'SEARCH_MY_VALENTINES':
                    this.state.set(telegramId, { mode: 'SEARCH_MY_VALENTINES' });
                    await this.bot.sendMessage(chatId, '🔍 Введи текст для поиска');
                    break;

                case 'BACK_TO_MENU':
                    this.state.delete(telegramId);
                    await this.bot.sendMessage(chatId, 'Главное меню 👇', this.mainMenu());
                    break;

                case 'RULES':
                    await this.bot.sendMessage(
                        chatId,
                        'ℹ️ Правила:\n— Анонимно\n— Вежливо\n— Без спама'
                    );
                    break;
            }

            await this.bot.answerCallbackQuery(query.id);
        });
    }



    private registerMessages() {
        this.bot.on('message', async (msg) => {
            if (!msg.from) return;

            const telegramId = msg.from.id.toString();
            const chatId = msg.chat.id;
            const state = this.state.get(telegramId);

            if (!state) {
                await this.bot.sendMessage(chatId, 'Используй меню 👇');
                return;
            }

            if ('receiverId' in state && msg.photo) {
                const sender = await this.telegramService.getOrCreateUser(msg.from);
                const receiver = await this.telegramService.getUserById(state.receiverId);

                const photo = msg.photo[msg.photo.length - 1];
                const caption = msg.caption ?? '';

                await this.telegramService.createValentine({
                    senderId: sender.id,
                    receiverId: receiver.id,
                    message: caption,
                    photoFileId: photo.file_id,
                });

                await this.bot.sendPhoto(
                    Number(receiver.telegramId),
                    photo.file_id,
                    {
                        caption: caption
                            ? `💌 Вам пришла анонимная валентинка:\n\n${caption}`
                            : '💌 Вам пришла анонимная валентинка',
                    }
                );

                await this.bot.sendMessage(chatId, '✅ Валентинка отправлена!');
                this.state.delete(telegramId);

                await this.bot.sendMessage(
                    chatId,
                    'Что дальше? 👇',
                    this.mainMenu(),
                );
                return;
            }

            if (msg.text?.startsWith('/')) return;

            if ('mode' in state && state.mode === 'SEARCH_MY_VALENTINES') {
                const user = await this.telegramService.getOrCreateUser(msg.from);

                const results = await this.telegramService.searchMyValentines(
                    user.id,
                    msg.text,
                );

                if (results.length === 0) {
                    await this.bot.sendMessage(chatId, '🔍 Ничего не найдено');
                } else {
                    for (const v of results) {
                        const caption =
                            `💌 Анонимная валентинка\n` +
                            `🕒 ${v.createdAt.toLocaleString()}\n\n` +
                            (v.message || '');

                        if (v.photoFileId) {
                            await this.bot.sendPhoto(chatId, v.photoFileId, { caption });
                        } else {
                            await this.bot.sendMessage(chatId, caption);
                        }
                    }
                }

                this.state.delete(telegramId);
                return;
            }

            if ('receiverId' in state && msg.text) {
                const sender = await this.telegramService.getOrCreateUser(msg.from);
                const receiver = await this.telegramService.getUserById(state.receiverId);

                await this.telegramService.createValentine({
                    senderId: sender.id,
                    receiverId: receiver.id,
                    message: msg.text,
                });

                await this.bot.sendMessage(
                    Number(receiver.telegramId),
                    `💌 Вам пришла анонимная валентинка:\n\n"${msg.text}"`
                );

                await this.bot.sendMessage(chatId, '✅ Валентинка отправлена!');
                this.state.delete(telegramId);

                await this.bot.sendMessage(
                    chatId,
                    'Что дальше? 👇',
                    this.mainMenu(),
                );
            }
        });
    }

    private mainMenu() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '💌 Отправить валентинку', callback_data: 'SEND_VALENTINE' }],
                    [{ text: '📥 Мои валентинки', callback_data: 'MY_VALENTINES' }],
                    [{ text: 'ℹ️ Правила', callback_data: 'RULES' }],
                ],
            },
        };
    }
}



