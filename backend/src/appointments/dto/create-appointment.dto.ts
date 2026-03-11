import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsISO8601()
  startAt: string;

  @IsISO8601()
  endAt: string;

  @IsOptional()
  @IsEnum(['SCHEDULED', 'CANCELLED', 'COMPLETED', 'AVAILABLE'])
  status?: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'AVAILABLE';

  @IsOptional()
  @IsEnum(['CONSULTATION', 'AUDIENCE', 'DOCUMENT', 'MEETING', 'OTHER'])
  type?: 'CONSULTATION' | 'AUDIENCE' | 'DOCUMENT' | 'MEETING' | 'OTHER';

  @IsOptional()
  @IsEnum(['ONLINE', 'IN_PERSON'])
  mode?: 'ONLINE' | 'IN_PERSON';

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  externalSource?: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}
