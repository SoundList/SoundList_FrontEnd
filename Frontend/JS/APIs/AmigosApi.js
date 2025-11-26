const API_BASE_URL = "http://localhost:5000"; 

// Helper de Autenticación
const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

const normalizeId = (id) => String(id || '').toLowerCase().trim();

// 1. BUSCADOR DE USUARIOS
export async function searchUsers(query) {
    if (!query || query.trim().length < 1) return [];
    
    try {
        const url = `${API_BASE_URL}/api/gateway/search/users?term=${encodeURIComponent(query)}`;
        console.log(`🔍 Buscando en: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) return [];
        
        const data = await response.json();
        const results = Array.isArray(data) ? data : (data.Items || data.items || []);
        
        return results.map(user => ({
            userId: user.UserId || user.userId || user.id, 
            username: user.Username || user.username || 'Usuario',
            imgProfile: user.imgProfile || user.ImgProfile || user.avatar || null,
            bio: user.Bio || user.bio || ''
        }));

    } catch (error) {
        console.error('Error búsqueda de usuarios:', error);
        return [];
    }
}

// 2. OBTENER LISTA DE SEGUIDORES (GENTE QUE ME SIGUE)
export async function getFollowers() {
    try {
        // CORRECCIÓN: Obtenemos el ID del localStorage
        const userId = localStorage.getItem('userId');
        if (!userId) return [];

        // CORRECCIÓN DE RUTA: Agregamos /users/{userId}/...
        const url = `${API_BASE_URL}/api/gateway/users/${userId}/followers`; 
        
        const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
        
        if (!response.ok) return [];
        
        const data = await response.json();
        const results = data.Items || data.items || [];

        return results.map(f => {
            const id = f.FollowerId || f.followerId || f.UserId || f.userId || f.id;
            return normalizeId(id);
        }).filter(id => id.length > 0);

    } catch (error) {
        console.error('Error al obtener Seguidores:', error);
        return [];
    }
}

// 3. OBTENER LISTA DE SEGUIDOS (GENTE A LA QUE SIGO)
export async function getFollowing() {
    try {
        // CORRECCIÓN: Obtenemos el ID del localStorage
        const userId = localStorage.getItem('userId');
        if (!userId) return [];

        // CORRECCIÓN DE RUTA: Agregamos /users/{userId}/...
        // Nota: Tu controller usa "follow" para "following", así que la ruta es /users/{id}/follow
        const url = `${API_BASE_URL}/api/gateway/users/${userId}/follow`; 
        
        const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() });

        if (!response.ok) return [];
        const data = await response.json();
        const results = data.Items || data.items || [];
        
        return results.map(f => {
            const id = f.FollowingId || f.followingId || f.UserId || f.userId || f.id;
            return normalizeId(id);
        }).filter(id => id.length > 0);

    } catch (error) {
        console.warn('Error al obtener Seguidos:', error);
        return [];
    }
}