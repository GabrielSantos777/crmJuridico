import axios from "axios";

export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;

export async function login(identifier: string, password: string) {
  const { data } = await api.post("/auth/login", { identifier, password });
  return data;
}

export async function adminLogin(email: string, password: string) {
  const { data } = await api.post("/auth/admin/login", { email, password });
  return data;
}

export async function selectOffice(selectionToken: string, officeId: string) {
  const { data } = await api.post("/auth/select-office", { selectionToken, officeId });
  return data;
}

export async function getOfficeLock() {
  const { data } = await api.get("/auth/office-lock");
  return data;
}

export async function forceChangePassword(changeToken: string, newPassword: string) {
  const { data } = await api.post("/auth/force-change", { changeToken, newPassword });
  return data;
}

export async function register(name: string, email: string, password: string, cpf: string) {
  const { data } = await api.post("/auth/register", { name, email, password, cpf });
  return data;
}

export async function getProfile() {
  const { data } = await api.get("/auth/profile");
  return data;
}

export async function listClients(q?: string) {
  const { data } = await api.get("/clients", { params: q ? { q } : undefined });
  return data;
}

export async function getClient(id: string) {
  const { data } = await api.get(`/clients/${id}`);
  return data;
}

export async function createClient(payload: {
  name: string;
  email?: string;
  phone: string;
  cpfCnpj?: string;
  address?: string;
}) {
  const { data } = await api.post("/clients", payload);
  return data;
}

export async function updateClient(id: string, payload: any) {
  const { data } = await api.patch(`/clients/${id}`, payload);
  return data;
}

export async function deleteClient(id: string) {
  const { data } = await api.delete(`/clients/${id}`);
  return data;
}

export async function listClientFiles(clientId: string) {
  const { data } = await api.get(`/clients/${clientId}/files`);
  return data;
}

export async function uploadClientFile(clientId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post(`/clients/${clientId}/files`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteClientFile(clientId: string, fileId: string) {
  const { data } = await api.delete(`/clients/${clientId}/files/${fileId}`);
  return data;
}

export async function downloadClientFile(clientId: string, fileId: string) {
  const response = await api.get(`/clients/${clientId}/files/${fileId}/download`, {
    responseType: "blob",
  });
  return response;
}

export async function listLeads(q?: string) {
  const { data } = await api.get("/leads", { params: q ? { q } : undefined });
  return data;
}

export async function createLead(payload: any) {
  const { data } = await api.post("/leads", payload);
  return data;
}

export async function updateLead(id: string, payload: any) {
  const { data } = await api.patch(`/leads/${id}`, payload);
  return data;
}

export async function deleteLead(id: string) {
  const { data } = await api.delete(`/leads/${id}`);
  return data;
}

export async function listAppointments(params?: {
  from?: string;
  to?: string;
  status?: string;
  type?: string;
}) {
  const { data } = await api.get("/appointments", { params });
  return data;
}

export async function listUpcomingAppointments(limit = 5) {
  const { data } = await api.get("/appointments/upcoming", { params: { limit } });
  return data;
}

export async function listAvailableAppointments(params?: { from?: string; to?: string }) {
  const { data } = await api.get("/appointments/available", { params });
  return data;
}

export async function createAppointment(payload: any) {
  const { data } = await api.post("/appointments", payload);
  return data;
}

export async function updateAppointment(id: string, payload: any) {
  const { data } = await api.patch(`/appointments/${id}`, payload);
  return data;
}

export async function deleteAppointment(id: string) {
  const { data } = await api.delete(`/appointments/${id}`);
  return data;
}

export async function getGoogleCalendarAuthUrl() {
  const { data } = await api.get('/google-calendar/auth-url');
  return data;
}

export async function getGoogleCalendarStatus() {
  const { data } = await api.get('/google-calendar/status');
  return data;
}

export async function listGoogleCalendarEvents(params?: {
  from?: string;
  to?: string;
  q?: string;
  maxResults?: number;
}) {
  const { data } = await api.get('/google-calendar/events', { params });
  return data;
}

export async function listGoogleCalendarUpcoming(limit = 5) {
  const { data } = await api.get('/google-calendar/upcoming', {
    params: { limit },
  });
  return data;
}

export async function disconnectGoogleCalendar() {
  const { data } = await api.delete('/google-calendar/disconnect');
  return data;
}

export async function listProcesses() {
  const { data } = await api.get("/processes");
  return data;
}

export async function importProcess(number: string, clientCode: string) {
  const { data } = await api.post("/processes/import", { number, clientCode });
  return data;
}

export async function listDeadlines() {
  const { data } = await api.get("/deadlines");
  return data;
}

export async function createDeadline(payload: any) {
  const { data } = await api.post("/deadlines", payload);
  return data;
}

export async function updateDeadline(id: string, payload: any) {
  const { data } = await api.patch(`/deadlines/${id}`, payload);
  return data;
}

export async function deleteDeadline(id: string) {
  const { data } = await api.delete(`/deadlines/${id}`);
  return data;
}

export async function listTrelloCards(listId?: string) {
  const { data } = await api.get("/trello/cards", { params: listId ? { listId } : undefined });
  return data;
}

export async function createTrelloCard(payload: {
  name: string;
  desc?: string;
  listId?: string;
  due?: string;
  createAppointment?: boolean;
}) {
  const { data } = await api.post("/trello/cards", payload);
  return data;
}

export async function syncTrello(listId?: string) {
  const { data } = await api.post("/trello/sync", { listId });
  return data;
}

export async function getMetrics() {
  const { data } = await api.get("/metrics");
  return data;
}

export async function getNotifications(unreadOnly?: boolean, limit?: number) {
  const { data } = await api.get("/notifications", { params: { unreadOnly, limit } });
  return data;
}

export async function markNotificationRead(id: string) {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.patch("/notifications/read-all");
  return data;
}

export async function getOfficeSettings() {
  const { data } = await api.get("/settings/office");
  return data;
}

export async function updateOfficeSettings(payload: any) {
  const { data } = await api.patch("/settings/office", payload);
  return data;
}

export async function getClientReport(params?: { from?: string; to?: string }) {
  const { data } = await api.get("/reports/clients", { params });
  return data;
}

export async function getProcessReport(params?: { from?: string; to?: string }) {
  const { data } = await api.get("/reports/processes", { params });
  return data;
}

export async function getPerformanceReport(params?: { from?: string; to?: string }) {
  const { data } = await api.get("/reports/performance", { params });
  return data;
}

export async function getFinancialReport(params?: { from?: string; to?: string }) {
  const { data } = await api.get("/reports/financial", { params });
  return data;
}

export async function getKanbanBoard() {
  const { data } = await api.get("/kanban");
  return data;
}

export async function createKanbanColumn(title: string) {
  const { data } = await api.post("/kanban/columns", { title });
  return data;
}

export async function updateKanbanColumn(id: string, title: string) {
  const { data } = await api.patch("/kanban/columns", { id, title });
  return data;
}

export async function createKanbanCard(payload: { columnId: string; title: string; description?: string; dueAt?: string }) {
  const { data } = await api.post("/kanban/cards", payload);
  return data;
}

export async function updateKanbanCard(payload: { id: string; title?: string; description?: string; dueAt?: string }) {
  const { data } = await api.patch("/kanban/cards", payload);
  return data;
}

export async function moveKanbanCard(payload: { id: string; toColumnId: string; order: number }) {
  const { data } = await api.patch("/kanban/cards/move", payload);
  return data;
}

export async function syncKanbanFromTrello() {
  const { data } = await api.post("/kanban/sync");
  return data;
}

export async function deleteKanbanCard(id: string) {
  const { data } = await api.post("/kanban/cards/delete", { id });
  return data;
}

export async function deleteKanbanColumn(id: string) {
  const { data } = await api.post("/kanban/columns/delete", { id });
  return data;
}

export async function uploadOfficeLogo(file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/settings/office/logo", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function listGroups() {
  const { data } = await api.get("/groups");
  return data;
}

export async function createGroup(payload: { name: string; role: string }) {
  const { data } = await api.post("/groups", payload);
  return data;
}

export async function inviteToGroup(groupId: string, email: string) {
  const { data } = await api.post(`/groups/${groupId}/invite`, { email });
  return data;
}

export async function removeGroupMember(groupId: string, userId: string) {
  const { data } = await api.delete(`/groups/${groupId}/members/${userId}`);
  return data;
}

export async function listUsers() {
  const { data } = await api.get("/users");
  return data;
}

export async function createUser(payload: { name: string; email: string; cpf?: string; password: string; groupId?: string }) {
  const { data } = await api.post("/users", payload);
  return data;
}

export async function updateUser(id: string, payload: { email?: string; role?: string; name?: string; cpf?: string }) {
  const { data } = await api.patch(`/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: string) {
  const { data } = await api.delete(`/users/${id}`);
  return data;
}

export async function updateGroup(id: string, payload: { name?: string; role?: string }) {
  const { data } = await api.patch(`/groups/${id}`, payload);
  return data;
}

export async function deleteGroup(id: string) {
  const { data } = await api.delete(`/groups/${id}`);
  return data;
}

export async function listOffices() {
  const { data } = await api.get("/offices");
  return data;
}

export async function createOffice(payload: any) {
  const { data } = await api.post("/offices", payload);
  return data;
}

export async function updateOffice(id: string, payload: any) {
  const { data } = await api.patch(`/offices/${id}`, payload);
  return data;
}

export async function deleteOffice(id: string) {
  const { data } = await api.delete(`/offices/${id}`);
  return data;
}

export async function adminListUsers() {
  const { data } = await api.get("/admin/users");
  return data;
}

export async function adminCreateUser(payload: any) {
  const { data } = await api.post("/admin/users", payload);
  return data;
}

export async function adminUpdateUser(id: string, payload: any) {
  const { data } = await api.patch(`/admin/users/${id}`, payload);
  return data;
}

export async function adminDeleteUser(id: string) {
  const { data } = await api.delete(`/admin/users/${id}`);
  return data;
}

export async function adminAddUserToOffice(userId: string, officeId: string, role: string) {
  const { data } = await api.post(`/admin/users/${userId}/offices`, { officeId, role });
  return data;
}

export async function adminRemoveUserFromOffice(userId: string, officeId: string) {
  const { data } = await api.delete(`/admin/users/${userId}/offices/${officeId}`);
  return data;
}

export async function updateMyPassword(payload: { currentPassword: string; newPassword: string }) {
  const { data } = await api.patch("/users/me/password", payload);
  return data;
}
