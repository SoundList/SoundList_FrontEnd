const GATEWAY_BASE_URL = 'http://localhost:5000'; 

/**
 * Helper para obtener headers de autenticación
 */
function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    // Si hay token, lo enviamos. Si no, enviamos objeto vacío (acceso público si el back lo permite)
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Pide los rankings al ContentAPI y prepara los filtros.
 */
export async function fetchRankings(config) {
    
    let endpoint = '';
    const params = {};

    if (config.tipo === 'canciones') {
        endpoint = `${GATEWAY_BASE_URL}/api/gateway/contents/song`;
    } else {
        endpoint = `${GATEWAY_BASE_URL}/api/gateway/contents/album`;
    }

    // 1. Enviamos el parámetro 'orden' al ContentAPI
    if (config.categoria === 'mejores') {
        params.orden = 'desc'; 
    } else if (config.categoria === 'peores') {
        params.orden = 'asc'; 
    }

    try {
        // AHORA INCLUIMOS LOS HEADERS EN LA CONFIGURACIÓN DE AXIOS
        const response = await window.axios.get(endpoint, {
            params: params,
            timeout: 5000,
            headers: getAuthHeaders() 
        });

        let items = response.data || [];
        
        // 2. FILTRADO (Frontend): Quitamos los ítems con calificación 0
        if (config.categoria !== 'masResenados') { 
            items = items.filter(item => 
                item.calification && item.calification > 0
            );
        }
        
        // 3. Filtrado por año
        if (config.ano) {
            items = items.filter(item => 
                item.releaseDate && item.releaseDate.startsWith(config.ano)
            );
        }

        return items;

    } catch (error) {
        console.error(`Error al obtener rankings [${config.tipo}]:`, error);
        throw new Error("No se pudieron cargar los rankings desde el Gateway.");
    }
}