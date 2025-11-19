import { API_BASE_URL } from './configApi.js';
const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

// 1. BUSCADOR 
export async function searchUsers(query) {
    if (!query || query.trim().length < 1) return [];
    
    try {
        const url = `${API_BASE_URL}/api/gateway/search/users?term=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) return [];
        
        const data = await response.json();
        const results = Array.isArray(data) ? data : (data.Items || data.items || [data]);
        
        return results.map(user => ({
            id: user.UserId || user.id,
            username: user.Username || user.username || 'Usuario',
            avatar: user.imgProfile || user.avatar || null,
            bio: user.Bio || user.bio || ''
        }));

    } catch (error) {
        console.error('Error búsqueda de usuarios:', error);
        return [];
    }
}
// 2. OBTENER LISTAS 
export async function getFollowers() {
    try {
        const currentUserId = localStorage.getItem('userId');
        if (!currentUserId) return []; 

        const url = `${API_BASE_URL}/api/gateway/users/${currentUserId}/followers`;
        const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
        
        if (!response.ok) return [];
        
        const data = await response.json();
        const results = data.Items || data.items || [];
        return results.map(f => f.followerId || f.FollowerId).filter(Boolean);

    } catch (error) {
        console.error('Error al obtener Seguidores:', error);
        return [];
    }
}

export async function getFollowing() {
    try {
        const currentUserId = localStorage.getItem('userId');
        if (!currentUserId) return []; 

        const url = `${API_BASE_URL}/api/gateway/users/${currentUserId}/follow`; 
        
        const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() });

        if (!response.ok) return [];
        const data = await response.json();
        const results = data.Items || data.items || [];

        return results.map(f => f.followingId || f.FollowingId).filter(Boolean);

    } catch (error) {
        console.warn('Error al obtener Seguidos:', error);
        return [];
    }
}