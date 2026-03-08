import { Module } from '@nestjs/common';
import { LeadsModule } from './leads/leads.module';
import { ClientsModule } from './clients/clients.module';
import { ProcessesModule } from './processes/processes.module';

@Module({
  imports: [LeadsModule, ClientsModule, ProcessesModule],
})
export class AppModule {}