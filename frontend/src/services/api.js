import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export const analyzesPipeline = (pipelineUrl, pat) =>
  api.post('/analyses', { pipelineUrl, pat }).then((r) => r.data);

export const listAnalyses = (limit = 20, offset = 0) =>
  api.get('/analyses', { params: { limit, offset } }).then((r) => r.data);

export const getAnalysis = (id) =>
  api.get(`/analyses/${id}`).then((r) => r.data);

export const deleteAnalysis = (id) =>
  api.delete(`/analyses/${id}`).then((r) => r.data);

export const pollAnalysis = async (id, onUpdate, interval = 2000, maxAttempts = 60) => {
  let attempts = 0;
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const data = await getAnalysis(id);
        onUpdate(data);
        if (data.status === 'completed' || data.status === 'failed') {
          resolve(data);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, interval);
        } else {
          reject(new Error('Polling timeout exceeded'));
        }
      } catch (err) {
        reject(err);
      }
    };
    poll();
  });
};
