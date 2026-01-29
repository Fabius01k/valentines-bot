import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/entities/user.entity";
import { Valentine } from "src/entities/valentine.entity";
import { TelegramService } from "./telegram.service";
import { TelegramController } from "./telegram.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Valentine]),
  ],
  providers: [TelegramService],
  controllers: [TelegramController],
})
export class TelegramModule {}