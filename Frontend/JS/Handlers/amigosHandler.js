import { searchUsers, getFollowing, getFollowers } from '../APIs/AmigosApi.js';
import { renderAmigoCard } from '../Components/amigoCard.js';

let searchTimeout;
const DEBOUNCE_DELAY = 300;

function debounce(func, delay = DEBOUNCE_DELAY) {
    return (...args) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            func(...args);
        }, delay);
    };
}
const normalizeId = (id) => String(id || '').toLowerCase().trim();


export async function toggleFollow(userId, username, buttonElement, state) {

    state = state || window._amigosState;
    if (!state || !state.followingUsers) {
        console.error("Estado no inicializado, creando uno temporal.");
        state = { followingUsers: new Set() }; 
    }

    const targetId = normalizeId(userId);
    const isFollowing = state.followingUsers.has(targetId);

    if (!window.userApi) {
        alert('Error: API de usuario no cargada.');
        return;
    }

    buttonElement.disabled = true;
    const originalHTML = buttonElement.innerHTML;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        if (isFollowing) {
            // ➖ UNFOLLOW (Dejar de seguir)
            await window.userApi.unfollowUser(userId);
            state.followingUsers.delete(targetId); 

            buttonElement.className = 'follow-btn follow';
            buttonElement.innerHTML = `<i class="fas fa-user-plus"></i> Seguir`;
            
        } else {
            // ➕ FOLLOW (Seguir)
            await window.userApi.followUser(userId);
            state.followingUsers.add(targetId); 
            buttonElement.className = 'follow-btn following';
            buttonElement.innerHTML = `<i class="fas fa-user-check"></i> Siguiendo`;
        }

        if (typeof state.loadReviews === 'function') {
            setTimeout(() => state.loadReviews(), 100); 
        }

    } catch (error) {
 
        if (error.response && error.response.status === 409) {
            console.warn(`Sincronizando: Ya seguías a ${username} (409 Conflict).`);
            state.followingUsers.add(targetId);
            
            buttonElement.className = 'follow-btn following';
            buttonElement.innerHTML = `<i class="fas fa-user-check"></i> Siguiendo`;
        } else {
            console.error(`Error en toggleFollow:`, error);
            alert(`No se pudo completar la acción.`);
            buttonElement.innerHTML = originalHTML;
        }
    } finally {
        buttonElement.disabled = false;
    }
}

// LÓGICA DE BÚSQUEDA
async function executeUserSearch(query, state) {
    const userSearchResults = document.getElementById('userSearchResults');
    if (!userSearchResults) return;

    userSearchResults.style.display = 'block';
    userSearchResults.innerHTML = `<div class="p-3 text-center text-white"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>`;

    try {
        const countSeguidos = state && state.followingUsers ? state.followingUsers.size : 0;
        console.log(`🔎 Buscando '${query}'. Tienes ${countSeguidos} seguidos en memoria.`);

        const users = await searchUsers(query);

        if (!users || users.length === 0) {
            userSearchResults.innerHTML = `<div class="p-3 text-center text-white">No se encontraron usuarios.</div>`;
            return;
        }

        const normalizedUsers = users.map(u => {
            const resolvedId = u.userId || u.UserId || u.id;
            const cleanId = normalizeId(resolvedId);
            
            return {
                userId: resolvedId,
                username: u.username,
                imgProfile: u.imgProfile,
                bio: u.bio,
                isFollowing: state && state.followingUsers ? state.followingUsers.has(cleanId) : false
            };
        });

        userSearchResults.innerHTML = normalizedUsers.map(user => renderAmigoCard(user)).join('');
        attachFollowButtonListeners(userSearchResults, state);

    } catch (err) {
        console.error("Error búsqueda:", err);
        userSearchResults.innerHTML = '<div class="p-3 text-center text-danger">Error al buscar.</div>';
    }
}

function attachFollowButtonListeners(container, state) {
    container.querySelectorAll('.follow-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.getAttribute('data-user-id');
            const username = this.getAttribute('data-username');
            toggleFollow(userId, username, this, state); 
        });
    });
}

// FUNCIONES INDIVIDUALES DE INICIALIZACIÓN
export function initializeUserSearch(state) {
    const userSearchInput = document.getElementById('userSearchInput');
    const userSearchClear = document.getElementById('userSearchClear');
    const userSearchResults = document.getElementById('userSearchResults');
    
    if (!userSearchInput) return;
    const debouncedSearch = debounce((query) => executeUserSearch(query, state));
    userSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (userSearchClear) userSearchClear.style.display = query ? 'block' : 'none';
        
        if (!query) {
            if (userSearchResults) userSearchResults.style.display = 'none';
            return;
        }
        
        debouncedSearch(query);
    });

    if (userSearchClear) {
        userSearchClear.addEventListener('click', () => {
            userSearchInput.value = '';
            if (userSearchResults) userSearchResults.style.display = 'none';
            userSearchClear.style.display = 'none';
        });
    }

document.addEventListener('click', (e) => {
        if (userSearchInput && userSearchResults && 
            !userSearchInput.contains(e.target) && 
            !userSearchResults.contains(e.target)) {
            if (userSearchInput.value === '') userSearchResults.style.display = 'none';
        }
    });
}

export function initializeReviewFilters(state) {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (state && state.loadReviews) state.loadReviews(btn.dataset.filter);
        });
    });
}

export function addReviewEventListeners(reviewsListElement, state) {
    if (!reviewsListElement) return;

    // Follow
    reviewsListElement.querySelectorAll('.review-follow-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.getAttribute('data-user-id');
            const username = this.getAttribute('data-username');
            toggleFollow(userId, username, this, state);
        });
    });

    // Like
    reviewsListElement.querySelectorAll('.btn-like').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const reviewId = this.getAttribute('data-review-id');
            if (state && state.toggleLike) state.toggleLike(reviewId, this);
        });
    });

    // Modales
    reviewsListElement.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.getAttribute('data-review-id');
            if (window.showCommentsModal) window.showCommentsModal(id);
        });
    });
    
    reviewsListElement.querySelectorAll('.review-clickable').forEach(div => {
        div.addEventListener('click', function() {
            const id = this.getAttribute('data-review-id');
            if (window.showReviewDetailModal) window.showReviewDetailModal(id);
        });
    });

    reviewsListElement.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.getAttribute('data-review-id');
            if (window.showDeleteReviewModal) window.showDeleteReviewModal(id, "esta reseña");
        });
    });
}

export async function initializeFollowData(state) {
    if (!state) return;
    try {
        const [followers, following] = await Promise.all([getFollowers(), getFollowing()]);

        state.followerUsers = new Set(followers);
        state.followingUsers = new Set(following);
        
        console.log(`✅ Estado inicializado. Sigues a: ${state.followingUsers.size} personas.`);
    } catch (e) {
        console.error('Error inicializando datos de seguimiento:', e);
    }
}

export const AmigosHandler = {
    init: async (state) => {
        await initializeFollowData(state); // Esperamos carga de datos antes de habilitar UI
        initializeUserSearch(state);
        initializeReviewFilters(state);
    },
    addReviewEventListeners,
    initializeFollowData
};

export function showReviewDetailModal(id) { console.log("Detalle reseña:", id); }
export function showLoginRequiredModal() { alert("Debes iniciar sesión"); }