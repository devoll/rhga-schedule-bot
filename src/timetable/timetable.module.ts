import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimetableService } from './timetable.service';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { ConfigModule } from '@nestjs/config';
import { Timetable } from './timetable.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Timetable]),
    GoogleSheetsModule,
    ConfigModule,
  ],
  providers: [TimetableService],
  exports: [TimetableService],
})
export class TimetableModule {}
