import { Module } from '@nestjs/common';
import { ProcessesService } from './processes.service';
import { ProcessesController } from './processes.controller';

@Module({
  providers: [ProcessesService],
  controllers: [ProcessesController]
})
export class ProcessesModule {}
