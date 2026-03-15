import { IsOptional, IsString } from 'class-validator';

export class UploadClientFileDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  base64: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  officeId?: string;
}
