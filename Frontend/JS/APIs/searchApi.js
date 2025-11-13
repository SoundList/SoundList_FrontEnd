// JavaScript/API/searchApi.js
import { API_BASE_URL } from './configApi.js';

export async function fetchSearchResults(query, signal) {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/gateway/contents/search`, {
            params: { query: query },
            signal: signal,
            timeout: 5000
        });
        return response.data;
    } catch (error) {
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
            return null; // Búsqueda cancelada, no es un error
        }
        console.error('Error en la búsqueda:', error);
        throw error; // Dejar que el handler maneje el error
    }
}