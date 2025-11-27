// JavaScript/API/apiConfig.js
// Esta es la URL de tu API Gateway, basada en tu configuración de Docker.
//export const API_BASE_URL = 'http://localhost:5000';
export const API_BASE_URL = 'https://proxy-merchandise-importantly-position.trycloudflare.com';

// Interceptor global para suprimir errores esperados (404, 500) que no deben mostrarse en consola
// Este interceptor debe ejecutarse ANTES que otros interceptores
if (typeof axios !== 'undefined' && typeof window !== 'undefined') {
    // Usar una marca para evitar múltiples registros
    if (!window.__axiosErrorInterceptorConfigured) {
        window.__axiosErrorInterceptorConfigured = true;
        
        // Agregar el interceptor al principio de la cadena
        axios.interceptors.response.use(
            response => response,
            error => {
                // Suprimir errores 404 y 500 para rutas específicas que son esperadas
                if (error.config && error.response) {
                    const status = error.response.status;
                    const url = error.config.url || '';
                    
                    // Errores esperados que no deben mostrarse en consola:
                    const shouldSuppress = 
                        // Errores 404/500 al obtener usuarios
                        (status === 404 || status === 500) && url.includes('/api/gateway/users/') ||
                        // Errores 404 al obtener canciones/álbumes
                        status === 404 && (url.includes('/Song/') || url.includes('/Album/')) ||
                        // Errores 404 al verificar reacciones
                        status === 404 && url.includes('/api/gateway/reactions/review/') ||
                        // Errores 500 en general para estas rutas
                        status === 500 && (url.includes('/api/gateway/users/') || url.includes('/Song/') || url.includes('/Album/'));
                    
                    if (shouldSuppress) {
                        // Retornar una respuesta simulada para que no se muestre como error
                        // Esto previene que axios muestre el error en la consola
                        return Promise.resolve({
                            status: status,
                            statusText: status === 404 ? 'Not Found' : 'Internal Server Error',
                            data: null,
                            headers: error.response.headers || {},
                            config: error.config
                        });
                    }
                }
                
                // Para otros errores, rechazar normalmente
                return Promise.reject(error);
            }
        );
    }
}