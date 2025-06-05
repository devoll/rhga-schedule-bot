import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ScheduleDocument = Schedule & Document;

@Schema({ timestamps: true })
export class Schedule {
  @Prop({ type: String })
  course: string; // Был "Курс"

  @Prop({ type: String, required: true })
  group: string; // Была "Группа"

  @Prop({ type: Date, required: true })
  date: Date; // Была "Дата"

  @Prop({ type: String, required: true })
  time: string; // Было "Время"

  @Prop({ type: String, required: true })
  subject: string; // Была "Дисциплина"

  @Prop({ type: String })
  lessonType: string; // Был "Вид занятий"

  @Prop({ type: String })
  teacherName: string; // Был "ФИО преподавателя"

  @Prop({ type: String })
  lessonFormat: string; // Был "Формат проведения занятия"

  @Prop({ type: String })
  location: string; // Была "Аудитория/ссылка"
}

export const ScheduleSchema = SchemaFactory.createForClass(Schedule);

// Если вы добавляли индексы, не забудьте обновить имена полей и здесь:
// ScheduleSchema.index({ group: 1, date: 1 });
