
// MOCK DATA (Se mantiene para la lógica de fallback)
const MOCK_USERS_ALL = [
    { id: 'user1', username: 'musiclover23', bio: 'Amante de la música indie y rock alternativo 🎸', avatar: '../Assets/default-avatar.png' },
    { id: 'user2', username: 'vinyl_collector', bio: 'Coleccionista de vinilos desde 2010.', avatar: '../Assets/default-avatar.png' },
    { id: 'user3', username: 'jazz_night', bio: 'Jazz, blues y soul. Siempre buscando nuevos sonidos.', avatar: '../Assets/default-avatar.png' },
    { id: 'user4', username: 'pop_enthusiast', bio: 'Pop, K-pop y todo lo que suene bien 🎵', avatar: '../Assets/default-avatar.png' },
    { id: 'user5', username: 'metalhead99', bio: 'Thrash metal en su máxima expresión 🤘', avatar: '../Assets/default-avatar.png' },
    { id: 'user6', username: 'electronic_dreams', bio: 'Electronic music producer.', avatar: '../Assets/default-avatar.png' },
];

function getAuthHeaders() {
    const token = localStorage.getItem("authToken");
    if (!token) return {};
    return { headers: { 'Authorization': `Bearer ${token}` } };
}


export async function searchUsers(query) {
    const lowerQuery = query.toLowerCase();
    const encodedQuery = encodeURIComponent(lowerQuery);
    
    const url = `${window.API_BASE_URL}/search/users?q=${encodedQuery}&limit=10`;

    let matchedUsers = [];

    // LÓGICA DE API REAL

    if (typeof axios !== 'undefined' && window.API_BASE_URL) {
        try {
            const response = await axios.get(url, getAuthHeaders());
            matchedUsers = response.data; 
            
        } catch (error) {
            console.error("❌ Error en la búsqueda de API real:", error.response?.data || error.message);
            console.warn("Usando datos MOCK de respaldo debido a un fallo en la API real.");
        }
    }
    // LÓGICA DE MOCK/FALLBACK
    if (matchedUsers.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 150)); 
        matchedUsers = MOCK_USERS_ALL.filter(user => 
            user.username.toLowerCase().includes(lowerQuery) || 
            user.bio.toLowerCase().includes(lowerQuery)
        ).slice(0, 10);
    }
    // VERIFICACIÓN DEL ESTADO DE SEGUIMIENTO
    const usersWithStatus = await Promise.all(matchedUsers.map(async user => {
        let isFollowing = false;

        if (window.userApi && window.userApi.checkFollowStatus) {
            try {
                isFollowing = await window.userApi.checkFollowStatus(user.id);
            } catch (e) {
            }
        }
        return { ...user, isFollowing };
    }));

    return usersWithStatus;
}
