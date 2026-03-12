import { Module } from '@nestjs/common';
import { LeadsModule } from './leads/leads.module';
import { ClientsModule } from './clients/clients.module';
import { ProcessesModule } from './processes/processes.module';
import { DeadlinesModule } from './deadlines/deadlines.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { IntegrationsModule } from './integrations/integrations.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { TrelloModule } from './trello/trello.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { MetricsModule } from './metrics/metrics.module';
import { ReportsModule } from './reports/reports.module';
import { KanbanModule } from './kanban/kanban.module';
import { GroupsModule } from './groups/groups.module';
import { OfficesModule } from './offices/offices.module';

@Module({
  imports: [
    LeadsModule,
    ClientsModule,
    ProcessesModule,
    DeadlinesModule,
    AuthModule,
    UsersModule,
    IntegrationsModule,
    AppointmentsModule,
    TrelloModule,
    NotificationsModule,
    SettingsModule,
    MetricsModule,
    ReportsModule,
    KanbanModule,
    GroupsModule,
    OfficesModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
