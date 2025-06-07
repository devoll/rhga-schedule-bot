import { Command, Help, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { TimetableService } from '../timetable/timetable.service';
import { Logger } from '@nestjs/common';

@Update()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(private readonly scheduleService: TimetableService) {}

  @Start()
  async start(ctx: Context) {
    await ctx.reply('Добро пожаловать!');
  }

  @Help()
  async help(ctx: Context) {
    await ctx.reply('Это команда /help. Здесь будет описание команд.');
  }

  @Command('next')
  async next(ctx: Context) {
    this.logger.log(`Получена команда /next от пользователя ${ctx.from.username || ctx.from.id}`);
    try {
      const scheduleMessage = await this.scheduleService.getNextDayScheduleFormatted();
      await ctx.reply(scheduleMessage, { parse_mode: 'HTML' }); // Используем HTML для поддержки переносов строк \n
    } catch (error) {
      this.logger.error('Ошибка при обработке команды /next:', error);
      await ctx.reply('Произошла ошибка при получении расписания. Попробуйте позже.');
    }
  }
}
