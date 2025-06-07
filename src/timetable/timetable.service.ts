import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import { TimetableItemDto } from './timetable-item.dto';
import { Timetable } from './timetable.entity';

@Injectable()
export class TimetableService {
  private readonly logger = new Logger(TimetableService.name);

  constructor(
    @InjectRepository(Timetable)
    private scheduleRepository: Repository<Timetable>,
  ) {}

  async overwriteSchedules(scheduleItems: TimetableItemDto[]): Promise<{
    newCount: number;
    deletedCount: number;
    groupsAffected: string[];
  }> {
    if (!scheduleItems || scheduleItems.length === 0) {
      this.logger.warn('No timetable items provided to overwrite.');
      return { newCount: 0, deletedCount: 0, groupsAffected: [] };
    }

    const groups = [...new Set(scheduleItems.map((item) => item.group))];
    this.logger.log(`Overwriting schedules for groups: ${groups.join(', ')}`);

    const deleteResult = await this.scheduleRepository.delete({
      group: In(groups),
    });
    this.logger.log(
      `Deleted ${deleteResult.affected || 0} old schedule entries for groups: ${groups.join(', ')}.`,
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
      } as Partial<Timetable>;
    });

    const entriesToInsert = mappedEntries.filter((entry) => {
      if (!(entry.date instanceof Date) || isNaN(entry.date.getTime())) {
        this.logger.error(
          `Skipping entry for group ${entry.group} due to invalid date: ${entry.date}`,
        );
        return false;
      }
      return true;
    });

    let createdSchedulesCount = 0;
    if (entriesToInsert.length > 0) {
      const createdSchedules =
        await this.scheduleRepository.save(entriesToInsert);
      createdSchedulesCount = createdSchedules.length;
      this.logger.log(
        `Inserted ${createdSchedulesCount} new schedule entries.`,
      );
    } else if (scheduleItems.length > 0) {
      this.logger.warn(
        'No valid timetable entries to insert after date parsing and filtering.',
      );
    }

    return {
      newCount: createdSchedulesCount,
      deletedCount: deleteResult.affected || 0,
      groupsAffected: groups,
    };
  }

  async getScheduleForGroup(groupName: string): Promise<Timetable[]> {
    return this.scheduleRepository.find({
      where: { group: groupName },
      order: { date: 'ASC', time: 'ASC' },
    });
  }

  private formatDate(date: Date): string {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      this.logger.error(`Invalid date passed to formatDate: ${date}`);
      return 'Invalid Date';
    }
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}.${month}.${year}`;
  }

  async getNextDayScheduleFormatted(): Promise<string> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    this.logger.debug(`Ищем расписание начиная с даты: ${today.toISOString()}`);

    const nextScheduleDayEntry = await this.scheduleRepository.findOne({
      where: {
        date: MoreThanOrEqual(today),
      },
      order: { date: 'ASC' },
      select: ['date'],
    });

    if (!nextScheduleDayEntry) {
      this.logger.log('Расписание на ближайшие дни не найдено.');
      return 'Расписание на ближайшие дни не найдено.';
    }

    const targetDate = nextScheduleDayEntry.date;
    this.logger.debug(
      `Найдена ближайшая дата с расписанием: ${targetDate.toISOString()}`,
    );

    const schedulesForDate: Timetable[] = await this.scheduleRepository.find({
      where: { date: targetDate },
      order: { group: 'ASC', time: 'ASC' },
    });

    if (!schedulesForDate || schedulesForDate.length === 0) {
      this.logger.warn(
        `Не найдено записей для даты ${this.formatDate(targetDate)}, хотя дата была найдена.`,
      );
      return `Расписание на ${this.formatDate(targetDate)} не найдено (нет записей).`;
    }

    this.logger.log(
      `Найдено ${schedulesForDate.length} записей на ${this.formatDate(targetDate)}`,
    );

    let response = `Расписание на ${this.formatDate(targetDate)}:\n\n`;
    const schedulesByGroup = schedulesForDate.reduce(
      (acc, schedule) => {
        if (!acc[schedule.group]) {
          acc[schedule.group] = [];
        }
        acc[schedule.group].push(schedule);
        return acc;
      },
      {} as Record<string, Timetable[]>,
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
