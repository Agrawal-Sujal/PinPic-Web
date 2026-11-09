import api from './client';

export const authApi = {
  login: async (credentials) => {
    // credentials: { email, password }
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    // userData: { name, email, password }
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  googleSignIn: async (idToken) => {
    // { idToken }
    const response = await api.post('/auth/google', { idToken });
    return response.data;
  },

  setUsername: async (username) => {
    const response = await api.patch('/users/username', { username });
    return response.data;
  },
};

