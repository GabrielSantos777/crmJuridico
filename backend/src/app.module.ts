import { Module } from '@nestjs/common';
import { LeadsModule } from './leads/leads.module';
import { ClientsModule } from './clients/clients.module';

@Module({
  imports: [LeadsModule, ClientsModule],
})
export class AppModule {}