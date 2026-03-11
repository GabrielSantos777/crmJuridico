import { IsIn, IsOptional, IsString } from 'class-validator';

export class WhatsappMessageDto {
  @IsString()
  phone: string;

  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['IN', 'OUT'])
  direction?: 'IN' | 'OUT';

  @IsOptional()
  meta?: any;
}
