import { API_BASE_URL } from './configApi.js';

const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const AmigosApi = {
    searchUsers: async (query) => {
        if (!query || query.length < 2) return [];
        try {
            const response = await fetch(`${API_BASE_URL}/api/gateway/users/username/${query}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!response.ok) return [];
            const data = await response.json();
            return Array.isArray(data) ? data : [data]; 
        } catch (error) {
            console.error('Error búsqueda:', error);
            return [];
        }
    },

    followUser: async (targetUserId) => {
        try {
            const currentUserId = localStorage.getItem('userId');
            const bodyData = {
                followerId: currentUserId,
                followingId: targetUserId
            };

            const response = await fetch(`${API_BASE_URL}/api/gateway/users/follow`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(bodyData)
            });
            
            return response.ok;
        } catch (error) {
            console.error('Error al seguir:', error);
            return false;
        }
    },
    unfollowUser: async (targetUserId) => {
        try {
            const currentUserId = localStorage.getItem('userId');
            const response = await fetch(
                `${API_BASE_URL}/api/gateway/users/${currentUserId}/unfollow/${targetUserId}`, 
                {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                }
            );

            return response.ok;
        } catch (error) {
            console.error('Error al dejar de seguir:', error);
            return false;
        }
    },

    getFollowers: async () => {
        try {
            const currentUserId = localStorage.getItem('userId');
            const response = await fetch(`${API_BASE_URL}/api/gateway/users/${currentUserId}/followers`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('Error followers:', error);
            return [];
        }
    },

    getFollowing: async () => {
        try {
            const currentUserId = localStorage.getItem('userId');
            if (!currentUserId) return []; 

            const response = await fetch(`${API_BASE_URL}/api/gateway/users/${currentUserId}/following`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) return [];
            const data = await response.json();
            return Array.isArray(data) ? data : []; 

        } catch (error) {
            console.warn('Fallo silencioso en getFollowing (la funcionalidad se ocultará):', error);
            return [];
        }
    }
}