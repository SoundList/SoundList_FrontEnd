
const GATEWAY_BASE_URL = 'http://localhost:5000';

/**
 * Pide los rankings al ContentAPI, que ya los tiene ordenados
 */
export async function fetchRankings(config) {
    
    //determinar el endpoint y los parámetros
    let endpoint = '';
    const params = {};

    if (config.tipo === 'canciones') {
        endpoint = `${GATEWAY_BASE_URL}/api/gateway/contents/song`;
    } else {
        endpoint = `${GATEWAY_BASE_URL}/api/gateway/contents/album`;
    }

    // ContentAPI ya ordena por 'calification' usando el param 'orden'
    if (config.categoria === 'mejores') {
        params.orden = 'desc'; // 'desc' = más rating
    } else if (config.categoria === 'peores') {
        params.orden = 'asc'; // 'asc' = menos rating
    }

    try {
        // llamar al Gateway
        const response = await window.axios.get(endpoint, {
            params: params,
            timeout: 5000
        });

        let items = response.data || [];

        // el backend nos da la lista ordenada, nosotros la filtramos por año
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