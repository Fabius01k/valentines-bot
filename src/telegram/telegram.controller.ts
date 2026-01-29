import { Controller, Post, Req } from "@nestjs/common";
import { TelegramService } from "./telegram.service";
import { Request } from 'express';


@Controller('telegram')
export class TelegramController {
    constructor(private readonly telegramService: TelegramService) { }

    @Post('webhook')
    async handleWebhook(@Req() req: Request) {
        const bot = this.telegramService.getBot();
        await bot.processUpdate(req.body);
        return { ok: true };
    }
}
