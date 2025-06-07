import { IsString, IsNotEmpty, IsOptional, IsISO8601 } from 'class-validator';
import { Transform } from 'class-transformer';

export class TimetableItemDto {
  @IsOptional()
  @IsString()
  course?: string;

  @IsNotEmpty()
  @IsString()
  group: string;

  @IsNotEmpty()
  @IsISO8601()
  @Transform(({ value }) => new Date(value))
  date: Date;

  @IsNotEmpty()
  @IsString()
  time: string;

  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  lessonType?: string;

  @IsOptional()
  @IsString()
  teacherName?: string;

  @IsOptional()
  @IsString()
  lessonFormat?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
