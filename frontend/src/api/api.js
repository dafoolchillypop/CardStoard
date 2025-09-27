import axios from 'axios';

const api = axios.create({
  baseURL: 'http://host.docker.internal:8000',
});

export default api;