import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('timetable') // 'schedules' будет именем таблицы в БД
export class Timetable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: true })
  course: string;

  @Column({ type: 'varchar' })
  group: string;

  @Column({ type: 'datetime' }) // SQLite сохранит это как TEXT в формате ISO8601
  date: Date;

  @Column({ type: 'varchar' })
  time: string;

  @Column({ type: 'varchar' })
  subject: string;

  @Column({ type: 'varchar', nullable: true })
  lessonType: string;

  @Column({ type: 'varchar', nullable: true })
  teacherName: string;

  @Column({ type: 'varchar', nullable: true })
  lessonFormat: string;

  @Column({ type: 'varchar', nullable: true })
  location: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
