import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn } from "typeorm";
import { User } from "./user.entity";

@Entity('valentines')
export class Valentine {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    sender: User;

    @ManyToOne(() => User)
    receiver: User;

    @Column('text')
    message: string;
    
    @Column({ nullable: true })
    photoFileId?: string;

    @CreateDateColumn()
    createdAt: Date;
}
