import api from '@/lib/api';

export const recipeProductionApi = {
  dashboard: () => api.get('/recipe-production/dashboard'),
  products: () => api.get('/recipe-production/products'),
  categories: (params?: unknown) => api.get('/recipe-production/categories', { params }),
  materials: (params?: unknown) => api.get('/recipe-production/materials', { params }),
  createMaterial: (data: unknown) => api.post('/recipe-production/materials', data),
  updateMaterial: (id: number, data: unknown) => api.put(`/recipe-production/materials/${id}`, data),
  deleteMaterial: (id: number) => api.delete(`/recipe-production/materials/${id}`),
  recipes: (params?: unknown) => api.get('/recipe-production/recipes', { params }),
  createRecipe: (data: unknown) => api.post('/recipe-production/recipes', data),
  updateRecipe: (id: number, data: unknown) => api.put(`/recipe-production/recipes/${id}`, data),
  deleteRecipe: (id: number) => api.delete(`/recipe-production/recipes/${id}`),
  orders: (params?: unknown) => api.get('/recipe-production/orders', { params }),
  createOrder: (data: unknown) => api.post('/recipe-production/orders', data),
  confirmOrder: (id: number) => api.post(`/recipe-production/orders/${id}/confirm`),
  report: (params?: unknown) => api.get('/recipe-production/reports/costs', { params }),
};
