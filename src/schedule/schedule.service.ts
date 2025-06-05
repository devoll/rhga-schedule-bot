import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Schedule, ScheduleDocument } from './schedule.schema';
import { ScheduleItemDto } from './schedule-item.dto';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectModel(Schedule.name) private scheduleModel: Model<ScheduleDocument>,
  ) {}

  async overwriteSchedules(scheduleItems: ScheduleItemDto[]): Promise<{
    newCount: number;
    deletedCount: number;
    groupsAffected: string[];
  }> {
    if (!scheduleItems || scheduleItems.length === 0) {
      this.logger.warn('No schedule items provided to overwrite.');
      return { newCount: 0, deletedCount: 0, groupsAffected: [] };
    }

    const groups = [...new Set(scheduleItems.map((item) => item.group))];
    this.logger.log(`Overwriting schedules for groups: ${groups.join(', ')}`);

    const deleteResult = await this.scheduleModel
      .deleteMany({ group: { $in: groups } })
      .exec();
    this.logger.log(
      `Deleted ${deleteResult.deletedCount} old schedule entries for groups: ${groups.join(', ')}.`,
    );

    const mappedEntries = scheduleItems.map((item) => {
      return {
        course: item.course,
        group: item.group,
        date: new Date(item.date),
        time: item.time,
        subject: item.subject,
        lessonType: item.lessonType,
        teacherName: item.teacherName,
        lessonFormat: item.lessonFormat,
        location: item.location,
      };
    });

    // Filter out entries where date is not a valid Date object
    const entriesToInsert = mappedEntries
      .filter((entry) => {
        if (!(entry.date instanceof Date)) {
          this.logger.error(
            `Skipping entry for group ${entry.group} due to invalid date (not a Date object): ${entry.date}`,
          );
          return false;
        }
        return true;
      })
      .map((entry) => ({ ...entry, date: entry.date as Date })); // Ensure type is Date for insertMany

    let createdSchedulesCount = 0;
    if (entriesToInsert.length > 0) {
      const createdResult =
        await this.scheduleModel.insertMany(entriesToInsert);
      createdSchedulesCount = createdResult.length;
      this.logger.log(
        `Inserted ${createdSchedulesCount} new schedule entries.`,
      );
    } else if (scheduleItems.length > 0) {
      this.logger.warn(
        'No valid schedule entries to insert after date parsing and filtering.',
      );
    }

    return {
      newCount: createdSchedulesCount,
      deletedCount: deleteResult.deletedCount || 0,
      groupsAffected: groups,
    };
  }

  async getScheduleForGroup(groupName: string): Promise<ScheduleDocument[]> {
    return this.scheduleModel
      .find({ group: groupName })
      .sort({ date: 1, time: 1 })
      .exec();
  }

  private formatDate(date: Date): string {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Месяцы в JS начинаются с 0
    const year = date.getUTCFullYear();
    return `${day}.${month}.${year}`;
  }

  async getNextDayScheduleFormatted(): Promise<string> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Устанавливаем начало текущего дня в UTC

    this.logger.debug(`Ищем расписание начиная с даты: ${today.toISOString()}`);

    // 1. Найти самую раннюю дату, на которую есть расписание (сегодня или позже)
    const nextScheduleDayEntry = await this.scheduleModel
      .findOne({ date: { $gte: today } })
      .sort({ date: 'asc' })
      .select('date')
      .lean()
      .exec();

    if (!nextScheduleDayEntry) {
      this.logger.log('Расписание на ближайшие дни не найдено.');
      return 'Расписание на ближайшие дни не найдено.';
    }

    const targetDate = nextScheduleDayEntry.date;
    this.logger.debug(
      `Найдена ближайшая дата с расписанием: ${targetDate.toISOString()}`,
    );

    // 2. Получить все записи расписания для этой даты
    const schedulesForDate: Schedule[] = await this.scheduleModel
      .find({ date: targetDate })
      .sort({ group: 'asc', time: 'asc' })
      .lean()
      .exec();

    if (!schedulesForDate || schedulesForDate.length === 0) {
      this.logger.warn(
        `Не найдено записей для даты ${this.formatDate(targetDate)}, хотя дата была найдена.`,
      );
      return `Расписание на ${this.formatDate(targetDate)} не найдено (нет записей).`;
    }

    this.logger.log(
      `Найдено ${schedulesForDate.length} записей на ${this.formatDate(targetDate)}`,
    );

    // 3. Форматировать расписание
    let response = `Расписание на ${this.formatDate(targetDate)}:\n\n`;
    const schedulesByGroup = schedulesForDate.reduce(
      (acc, schedule) => {
        if (!acc[schedule.group]) {
          acc[schedule.group] = [];
        }
        acc[schedule.group].push(schedule);
        return acc;
      },
      {} as Record<string, Schedule[]>,
    );

    for (const groupName in schedulesByGroup) {
      response += `Группа: ${groupName}\n`;
      schedulesByGroup[groupName].forEach((item) => {
        response += [
          `🕙 ${item.time}`,
          `📖 ${item.subject}`,
          `🏷️ ${item.lessonType}`,
          `👨‍🏫 ${item.teacherName}`,
          `📚 ${item.lessonFormat}`,
          `📌 ${item.location}`,
          '---------------------',
          '',
        ].join('\n');
      });
      response += '\n';
    }
    return response.trim();
  }
}
