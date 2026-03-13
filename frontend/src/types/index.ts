// Types for the Legal CRM

export interface User {
  id: string;
  name: string;
  email: string;
  token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone: string;
  document?: string; // CPF or CNPJ
  code?: string;
  address?: string;
  createdAt: string;
}

export interface Process {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  area: string;
  status: 'Em andamento' | 'Arquivado' | 'Suspenso' | 'Encerrado';
  court: string;
  createdAt: string;
}

export interface Deadline {
  id: string;
  title: string;
  processId: string;
  processNumber: string;
  startDate: string;
  dueDate: string;
  status: 'Pendente' | 'Cumprido' | 'Vencido';
}

export interface DashboardMetrics {
  leadsMonth: number;
  newClients: number;
  conversionRate: number;
  estimatedRevenue: number;
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone: string;
  source?: string;
  classification?: string;
  status: 'Novo' | 'Contatado' | 'Qualificado' | 'Convertido' | 'Perdido' | string;
  createdAt: string;
}
