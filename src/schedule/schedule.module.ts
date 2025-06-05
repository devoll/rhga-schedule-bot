import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleService } from './schedule.service';
import { Schedule } from './schedule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Schedule]),
  ],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
