# API Endpoints (Backend)

Base URL: `https://SEU_DOMINIO`

## Regras gerais

- Rotas com `JwtAuthGuard` exigem header:
  - `Authorization: Bearer <token>`
- Rotas com `OfficeGuard`:
  - usuarios normais usam `officeId` vindo do token.
  - `SUPER_ADMIN` precisa enviar `x-office-id` quando o token nao tiver office.
- Rotas de integracao (`/integrations/*` e `/automation/*`) exigem:
  - `officeId` via `x-office-id` header ou campo/query `officeId` (conforme rota).
- Regra de senha forte (registro, criacao de usuario, troca de senha):
  - minimo 8 chars, 1 maiuscula, 1 numero, 1 caractere especial.

---

## Publicas

### App

| Metodo | Endpoint | Recebe |
|---|---|---|
| GET | `/` | nada |

### Auth

| Metodo | Endpoint | Recebe |
|---|---|---|
| POST | `/auth/login` | body: `{ password, identifier? , email? , cpf? }` |
| POST | `/auth/select-office` | body: `{ selectionToken, officeId }` |
| POST | `/auth/force-change` | body: `{ changeToken, newPassword }` |
| GET | `/auth/office-lock` | nada |
| POST | `/auth/admin/login` | body: `{ email, password }` |

Obs:
- `POST /auth/login` pode retornar fluxo normal com `access_token` ou fluxo de selecao/troca de senha.

---

## Auth (JWT)

### Auth

| Metodo | Endpoint | Auth | Recebe |
|---|---|---|---|
| POST | `/auth/register` | JWT + Roles(`ADMIN`,`LAWYER`) | body: `{ name, email, password, cpf }` |
| GET | `/auth/profile` | JWT | nada |

### Leads

| Metodo | Endpoint | Auth | Recebe |
|---|---|---|---|
| POST | `/leads` | JWT + Office | body: `{ name, phone, email?, source?, classification?, notes? }` |
| GET | `/leads` | JWT + Office | query: `q?` |
| GET | `/leads/:id` | JWT + Office | path: `id` |
| PATCH | `/leads/:id` | JWT + Office | path: `id`, body parcial de lead |
| DELETE | `/leads/:id` | JWT + Office | path: `id` |
| POST | `/leads/:code/convert` | JWT + Office | path: `code` |

### Clients

| Metodo | Endpoint | Auth | Recebe |
|---|---|---|---|
| GET | `/clients` | JWT + Office | query: `q?` |
| POST | `/clients` | JWT + Office | body minimo: `{ name, phone }`; comuns: `email?`, `cpfCnpj?`, `address?`, `status?` |
| GET | `/clients/:id` | JWT + Office | path: `id` |
| PATCH | `/clients/:id` | JWT + Office | path: `id`, body parcial de cliente |
| DELETE | `/clients/:id` | JWT + Office | path: `id` |
| GET | `/clients/:id/files` | JWT + Office | path: `id` |
| POST | `/clients/:clientId/files` | JWT + Office | `multipart/form-data`, campo `file` |
| GET | `/clients/:id/files/:fileId/download` | JWT + Office | path: `id`, `fileId` |
| DELETE | `/clients/:id/files/:fileId` | JWT + Office | path: `id`, `fileId` |

### Processes

| Metodo | Endpoint | Auth | Recebe |
|---|---|---|---|
| POST | `/processes` | JWT + Office | body: `{ clientCode, number, title, area, status }` |
| POST | `/processes/:code/events` | JWT + Office | path: `code`, body: `{ description }` |
| GET | `/processes` | JWT + Office | nada |
| GET | `/processes/cnj/:number` | JWT + Office | path: `number` |
| POST | `/processes/import` | JWT + Office | body: `{ number, clientCode }` |
| GET | `/processes/:code` | JWT + Office | path: `code` |

### Deadlines

| Metodo | Endpoint | Auth | Recebe |
|---|---|---|---|
| POST | `/deadlines` | JWT + Office | body minimo: `{ title, startDate, dueDate, processId }`; opcionais: `description?`, `status?` |
| GET | `/deadlines` | JWT + Office | nada |
| PATCH | `/deadlines/:id` | JWT + Office | path: `id`, body parcial de prazo |
| DELETE | `/deadlines/:id` | JWT + Office | path: `id` |

### Appointments

| Metodo | Endpoint | Auth | Recebe |
|---|---|---|---|
| GET | `/appointments` | JWT + Office | query: `from?`, `to?`, `status?`, `type?` |
| GET | `/appointments/upcoming` | JWT + Office | query: `limit?` |
| GET | `/appointments/available` | JWT + Office | query: `from?`, `to?` |
| POST | `/appointments` | JWT + Office | body: `{ title, startAt, endAt, description?, status?, type?, mode?, location?, notes?, phone?, channel?, leadId?, clientId?, externalSource?, externalId? }` |
| PATCH | `/appointments/:id` | JWT + Office | path: `id`, body parcial do DTO de appointment |
| POST | `/appointments/:id/book` | JWT + Office | path: `id`, body parcial do DTO de appointment |
| DELETE | `/appointments/:id` | JWT + Office | path: `id` |

### Trello

| Metodo | Endpoint | Auth | Recebe |
|---|---|---|---|
| GET | `/trello/cards` | JWT + Office | query: `listId?` |
| POST | `/trello/cards` | JWT + Office | body: `{ name, desc?, listId?, due?, createAppointment? }` |
| POST | `/trello/sync` | JWT + Office | body: `{ listId? }` |

### Kanban

| Metodo | Endpoint | Auth | Recebe |
|---|---|---|---|
| GET | `/kanban` | JWT + Office | nada |
| POST | `/kanban/columns` | JWT + Office | body: `{ title }` |
| PATCH | `/kanban/columns` | JWT + Office | body: `{ id, title }` |
| POST | `/kanban/cards` | JWT + Office | body: `{ columnId, title, description?, dueAt? }` |
| PATCH | `/kanban/cards` | JWT + Office | body: `{ id, title?, description?, dueAt? }` |
| PATCH | `/kanban/cards/move` | JWT + Office | body: `{ id, toColumnId, order }` |
| POST | `/kanban/cards/delete` | JWT + Office | body: `{ id }` |
| POST | `/kanban/columns/delete` | JWT + Office | body: `{ id }` |
| POST | `/kanban/sync` | JWT + Office | nada |

### Notifications

| Metodo | Endpoint | Auth | Recebe |
|---|---|---|---|
| GET | `/notifications` | JWT + Office | query: `unreadOnly?` (`true/false`), `limit?` |
| PATCH | `/notifications/:id/read` | JWT + Office | path: `id` |
| PATCH | `/notifications/read-all` | JWT + Office | nada |

### Settings

| Metodo | Endpoint | Auth | Recebe |
|---|---|---|---|
| GET | `/settings/office` | JWT + Office | nada |
| PATCH | `/settings/office` | JWT + Office | body parcial: `{ name?, cnpj?, address?, phone?, email?, logoUrl?, workingHours? }` |
| POST | `/settings/office/logo` | JWT + Office | `multipart/form-data`, campo `file` (imagem, max 5MB) |

### Users

| Metodo | Endpoint | Auth | Recebe |
|---|---|---|---|
| POST | `/users` | JWT + Roles(`ADMIN`,`LAWYER`) | body: `{ name, email, password, cpf, groupId? }` |
| GET | `/users/me` | JWT | nada |
| PATCH | `/users/me/password` | JWT | body: `{ currentPassword, newPassword }` |
| GET | `/users` | JWT + Roles(`ADMIN`,`LAWYER`) | nada |
| POST | `/users/create` | JWT + Roles(`ADMIN`,`LAWYER`) | body: `{ name, email, password, cpf, groupId? }` |
| PATCH | `/users/:id` | JWT + Roles(`ADMIN`,`LAWYER`) | path: `id`, body: `{ email?, name?, cpf?, role? }` |
| DELETE | `/users/:id` | JWT + Roles(`ADMIN`,`LAWYER`) | path: `id` |

### Groups

| Metodo | Endpoint | Auth | Recebe |
|---|---|---|---|
| GET | `/groups` | JWT + Roles(`ADMIN`,`LAWYER`) | nada |
| POST | `/groups` | JWT + Roles(`ADMIN`,`LAWYER`) | body: `{ name, role }` (`role`: `ADMIN`, `LAWYER`, `BASIC`, `UNASSIGNED`) |
| POST | `/groups/:id/invite` | JWT + Roles(`ADMIN`,`LAWYER`) | path: `id`, body: `{ email }` |
| POST | `/groups/:id/members` | JWT + Roles(`ADMIN`,`LAWYER`) | path: `id`, body: `{ userId }` |
| DELETE | `/groups/:id/members/:userId` | JWT + Roles(`ADMIN`,`LAWYER`) | path: `id`, `userId` |
| PATCH | `/groups/:id` | JWT + Roles(`ADMIN`,`LAWYER`) | path: `id`, body: `{ name?, role? }` |
| DELETE | `/groups/:id` | JWT + Roles(`ADMIN`,`LAWYER`) | path: `id` |

### Metrics

| Metodo | Endpoint | Auth | Recebe |
|---|---|---|---|
| GET | `/metrics` | JWT + Roles(`ADMIN`,`LAWYER`) | nada |

### Reports

| Metodo | Endpoint | Auth | Recebe |
|---|---|---|---|
| GET | `/reports/clients` | JWT + Roles(`ADMIN`,`LAWYER`) | query: `from?`, `to?` |
| GET | `/reports/processes` | JWT + Roles(`ADMIN`,`LAWYER`) | query: `from?`, `to?` |
| GET | `/reports/performance` | JWT + Roles(`ADMIN`,`LAWYER`) | query: `from?`, `to?` |
| GET | `/reports/financial` | JWT + Roles(`ADMIN`,`LAWYER`) | query: `from?`, `to?` |

### Offices (somente SUPER_ADMIN)

| Metodo | Endpoint | Auth | Recebe |
|---|---|---|---|
| GET | `/offices` | JWT + Roles(`SUPER_ADMIN`) | nada |
| POST | `/offices` | JWT + Roles(`SUPER_ADMIN`) | body: `{ name, cnpj, domain?, email?, phone?, adminName, adminEmail, adminPassword }` |
| PATCH | `/offices/:id` | JWT + Roles(`SUPER_ADMIN`) | path: `id`, body: `{ name?, cnpj?, domain?, email?, phone? }` |
| DELETE | `/offices/:id` | JWT + Roles(`SUPER_ADMIN`) | path: `id` |

### Admin Users (somente SUPER_ADMIN)

| Metodo | Endpoint | Auth | Recebe |
|---|---|---|---|
| GET | `/admin/users` | JWT + Roles(`SUPER_ADMIN`) | nada |
| POST | `/admin/users` | JWT + Roles(`SUPER_ADMIN`) | body: `{ name, email, password, cpf?, officeId?, role? }` |
| PATCH | `/admin/users/:id` | JWT + Roles(`SUPER_ADMIN`) | path: `id`, body: `{ email?, name?, cpf? }` |
| DELETE | `/admin/users/:id` | JWT + Roles(`SUPER_ADMIN`) | path: `id` |
| POST | `/admin/users/:id/offices` | JWT + Roles(`SUPER_ADMIN`) | path: `id`, body: `{ officeId, role }` |
| DELETE | `/admin/users/:id/offices/:officeId` | JWT + Roles(`SUPER_ADMIN`) | path: `id`, `officeId` |

---

## Integracoes (Office ID)

Auth padrao:
- `officeId` obrigatorio (header `x-office-id` ou body/query, conforme rota)

### Integrations

| Metodo | Endpoint | Recebe |
|---|---|---|
| POST | `/integrations/whatsapp/message` | body: `{ phone, text, name?, direction?('IN'/'OUT'), meta?, officeId? }`; header opcional: `x-office-id` |
| POST | `/integrations/whatsapp/close` | body: `{ phone, officeId? }`; header opcional: `x-office-id` |
| POST | `/integrations/triage` | body: `{ leadId, classification?, status?, notes?, officeId? }`; header opcional: `x-office-id` |
| GET | `/integrations/client-by-phone` | query: `phone`, `officeId?`; header opcional: `x-office-id` |
| GET | `/integrations/process/latest-by-client` | query: `clientCode`, `officeId?`; header opcional: `x-office-id` |
| GET | `/integrations/process/latest-by-phone` | query: `phone`, `officeId?`; header opcional: `x-office-id` |
| GET | `/integrations/appointments/availability` | sem query de data/duracao; opcional apenas `officeId?`; header opcional: `x-office-id` |
| GET | `/integrations/appointments` | query: `from`, `to`, `officeId?`; header opcional: `x-office-id` |
| POST | `/integrations/appointments` | body: `{ title, startAt, endAt, type?, mode?, status?, description?, phone?, leadId?, clientId?, channel?, officeId? }`; header opcional: `x-office-id` |
| POST | `/integrations/client-file` | body: `{ clientId? ou phone?, base64, fileName?, mimeType?, officeId? }`; header opcional: `x-office-id` |

Obs para disponibilidade (`GET /integrations/appointments/availability`):
- janela fixa: dia atual + 3 dias corridos.
- somente dias uteis (segunda a sexta).
- horario permitido: `09:00` ate `18:00`.
- blocos fixos de 1 hora (`09:00`, `10:00`, `11:00`, ... `17:00`) com arredondamento para a proxima hora cheia.
- nao retorna horarios passados do dia atual.
- nao retorna horario com conflito com compromisso `SCHEDULED`.

### Automation

| Metodo | Endpoint | Recebe |
|---|---|---|
| POST | `/automation/lead` | body: `{ name, phone, email?, source?, classification?, notes?, officeId? }`; header opcional: `x-office-id` |
