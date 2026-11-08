import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach active User ID header for role-based scoping and instant persona switching
api.interceptors.request.use((config) => {
  const storedUser = localStorage.getItem('eventops_user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user && user.id) {
        config.headers['x-user-id'] = user.id;
        config.headers['Authorization'] = `Bearer ${user.id}`;
      }
    } catch (e) {
      console.error('Failed to parse stored user in request interceptor', e);
    }
  }
  return config;
}, (error) => Promise.reject(error));

export const authAPI = {
  getUsers: () => api.get('/auth/users'),
  getProfile: () => api.get('/auth/me'),
  login: (data) => api.post('/auth/login', data),
  updateProfile: (data) => api.put('/auth/profile', data),
  updateUserRole: (userId, role) => api.put(`/auth/users/${userId}/role`, { role }),
  resetDemoData: () => api.post('/auth/reset-demo-data')
};

export const eventAPI = {
  getAll: () => api.get('/events'),
  getById: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`)
};

export const departmentAPI = {
  getAll: (params) => api.get('/departments', { params }),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  addMember: (deptId, data) => api.post(`/departments/${deptId}/members`, data),
  removeMember: (deptId, membershipId) => api.delete(`/departments/${deptId}/members/${membershipId}`)
};

export const taskAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  start: (id) => api.post(`/tasks/${id}/start`),
  submitProof: (id, data) => api.post(`/tasks/${id}/submit-proof`, data),
  approve: (id, data) => api.post(`/tasks/${id}/approve`, data),
  reject: (id, data) => api.post(`/tasks/${id}/reject`, data),
  complete: (id) => api.post(`/tasks/${id}/complete`),
  delete: (id) => api.delete(`/tasks/${id}`)
};

export const issueAPI = {
  getAll: (params) => api.get('/issues', { params }),
  getById: (id) => api.get(`/issues/${id}`),
  report: (data) => api.post('/issues', data),
  escalate: (id, data) => api.post(`/issues/${id}/escalate`, data),
  resolve: (id, data) => api.post(`/issues/${id}/resolve`, data)
};

export const messageAPI = {
  getByIssue: (issueId) => api.get(`/messages/issue/${issueId}`),
  send: (issueId, data) => api.post(`/messages/issue/${issueId}`, data)
};

export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: (data) => api.put('/notifications/mark-all-read', data)
};

export const activityAPI = {
  getAll: (params) => api.get('/activities', { params })
};

export const collaborationAPI = {
  sendRequest: (data) => api.post('/collaborations', data),
  getPending: () => api.get('/collaborations/pending'),
  respond: (id, action) => api.post(`/collaborations/${id}/respond`, { action }),
  getEventCollaborations: (eventId) => api.get(`/collaborations/event/${eventId}`)
};

export default api;
