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
}
