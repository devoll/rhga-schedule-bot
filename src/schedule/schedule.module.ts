import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleService } from './schedule.service';
import { Schedule, ScheduleSchema } from './schedule.schema'; // Схема находится в src/schedule.schema.ts

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Schedule.name, schema: ScheduleSchema },
    ]),
  ],
  providers: [ScheduleService],
  exports: [ScheduleService], // Экспортируем сервис, чтобы он был доступен в SyncModule
})
export class ScheduleModule {}
