import { Injectable, OnModuleInit } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { TelegramHandlers } from './telegram.handlers';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { Not, Repository } from 'typeorm';
import { Valentine } from 'src/entities/valentine.entity';


@Injectable()
export class TelegramService implements OnModuleInit {
    private bot: TelegramBot;

    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(Valentine)
        private readonly valentineRepo: Repository<Valentine>,
    ) { }

    onModuleInit() {
        const token = process.env.BOT_TOKEN;
        this.bot = new TelegramBot(token, { polling: true });

        // this.bot = new TelegramBot(token, {
        //     polling: true,
        // });

        const handlers = new TelegramHandlers(this.bot, this);
        handlers.register();
    }

    getBot() {
        return this.bot;
    }

    async getOrCreateUser(from: TelegramBot.User): Promise<User> {
        const telegramId = from.id.toString();

        let user = await this.userRepo.findOne({
            where: { telegramId },
        });

        if (!user) {
            user = this.userRepo.create({
                telegramId,
                username: from.username ?? null,
                firstName: from.first_name,
            });

            await this.userRepo.save(user);
        }

        return user;
    }

    async getOtherUsers(currentTelegramId: string) {
        return this.userRepo.find({
            where: {
                telegramId: Not(currentTelegramId),
            },
        });
    }

    async getUserById(id: string) {
        return this.userRepo.findOneByOrFail({ id });
    }

    async createValentine(data: {
        senderId: string;
        receiverId: string;
        message: string;
        photoFileId?: string;
    }) {
        const valentine = this.valentineRepo.create({
            sender: { id: data.senderId },
            receiver: { id: data.receiverId },
            message: data.message,
            photoFileId: data.photoFileId ?? null,
        });

        return this.valentineRepo.save(valentine);
    }

    async getMyValentines(userId: string, limit = 5) {
        return this.valentineRepo.find({
            where: {
                receiver: { id: userId },
            },
            order: {
                createdAt: 'DESC',
            },
            take: limit,
        });
    }

    async searchMyValentines(userId: string, query: string) {
        return this.valentineRepo
            .createQueryBuilder('v')
            .where('v.receiverId = :userId', { userId })
            .andWhere('v.message ILIKE :q', { q: `%${query}%` })
            .orderBy('v.createdAt', 'DESC')
            .getMany();
    }


}


