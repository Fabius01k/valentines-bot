import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    telegramId: string;

    @Column({ nullable: true })
    username: string;

    @Column()
    firstName: string;

    @CreateDateColumn()
    createdAt: Date;
}
