import { All, Controller, Req, Res } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { Request, Response } from 'express';

@Controller('telegram')
export class TelegramController {
  constructor(@InjectBot() private bot: Telegraf<any>) {}

  @All('webhook')
  async webhook(@Req() req: Request, @Res() res: Response) {
    return this.bot.webhookCallback('/telegram/webhook')(req, res);
  }
}
