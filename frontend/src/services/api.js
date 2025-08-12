import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000',
});

export async function generateQuoteAPI(formData) {
  const res = await api.post('/api/generate-quote', formData, { responseType: 'blob' });
  return res.data; // returns PDF blob
}
