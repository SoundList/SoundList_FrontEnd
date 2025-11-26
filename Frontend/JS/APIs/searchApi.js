// JavaScript/API/searchApi.js
import { API_BASE_URL } from './configApi.js';

// Helper para obtener el token si existe
function getAuthHeaders() {
    const token = localStorage.getItem("authToken");
    // Si hay token, lo mandamos. Si no, mandamos objeto vacío (búsqueda anónima)
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function fetchSearchResults(query, signal) {
    try {
        // Usar axios global o importarlo
        const axiosInstance = typeof axios !== 'undefined' ? axios : (await import('axios')).default;
        
        const response = await axiosInstance.get(`${API_BASE_URL}/api/gateway/contents/search`, {
            params: { query: query },
            headers: getAuthHeaders(), // <--- Inyección del Token aquí
            signal: signal,
            timeout: 5000
        });
        return response.data;
    } catch (error) {
        // Manejo específico para cancelaciones de Axios (usuario escribe muy rápido)
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
            return null; 
        }
        console.error('Error en la búsqueda:', error);
        throw error; 
    }
}