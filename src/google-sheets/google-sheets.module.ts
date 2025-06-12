import { Module } from '@nestjs/common';
import { GoogleSheetsService } from './google-sheets.service';
import { HttpModule } from '@nestjs/axios';
import { Agent as HttpsAgent } from 'https';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => {
        const agent = new HttpsAgent({
          family: 4,
          timeout: 30_000,
        });
        return {
          timeout: 30_000,
          httpsAgent: agent,
          headers: { 'User-Agent': 'NestJS/GoogleDocsFetcher' },
        };
      },
    }),
  ],
  providers: [GoogleSheetsService],
  exports: [GoogleSheetsService],
})
export class GoogleSheetsModule {}
