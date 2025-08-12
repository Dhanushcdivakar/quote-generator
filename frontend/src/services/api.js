import axios from 'axios';

const api = axios.create({
  baseURL:'https://quote-generator-backend-u6ue.onrender.com',
});

export async function generateQuoteAPI(formData) {
  const res = await api.post('/api/generate-quote', formData, { responseType: 'blob' });
  return res.data; // returns PDF blob
}
