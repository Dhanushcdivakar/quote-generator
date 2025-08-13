import axios from 'axios';

const api = axios.create({
  baseURL: 'https://quote-generator-backend-g5pblztqe-dhanushs-projects-20e5ea0f.vercel.app',
});

export async function generateQuoteAPI(formData) {
  const res = await api.post('/api/generate-quote', formData, { responseType: 'blob' });
  return res.data; // returns PDF blob
}
