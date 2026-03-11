import { IsOptional, IsString } from 'class-validator';

export class TriageDto {
  @IsString()
  leadId: string;

  @IsOptional()
  @IsString()
  classification?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
