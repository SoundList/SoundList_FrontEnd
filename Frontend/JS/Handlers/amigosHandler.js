import { searchUsers, getFollowing, getFollowers } from '../APIs/AmigosApi.js';
import { renderAmigoCard } from '../Components/amigoCard.js';

// --- ESTADO GLOBAL (Para que funcione en toda la app) ---
const globalState = {
    followingUsers: new Set(),
    followerUsers: new Set(),
    isInitialized: false
};

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

// --- FUNCIÓN SEGURA PARA LIMPIAR LISTAS (La clave para que no falle el refresh) ---
function cleanList(list) {
    if (!Array.isArray(list)) return [];
    return list.map(item => {
        // 1. Si ya es un ID (String), lo usamos directo
        if (typeof item === 'string') return normalizeId(item);
        
        // 2. Si es Objeto, buscamos cualquier variante de ID posible
        if (typeof item === 'object' && item !== null) {
            const id = item.userId || item.UserId || item.id || item.Id || 
                       item.FollowingId || item.followingId || 
                       item.FollowerId || item.followerId;
            return normalizeId(id);
        }
        return null;
    }).filter(id => id !== null && id !== ''); // Filtramos nulos
}

// --- LÓGICA DE FOLLOW ---

export async function toggleFollow(userId, username, buttonElement, state) {
    const currentState = state || globalState;

    // Asegurar inicialización si falla
    if (!currentState.followingUsers || currentState.followingUsers.size === 0) {
        await initializeFollowData(currentState);
    }

    const targetId = normalizeId(userId);
    const isFollowing = currentState.followingUsers.has(targetId);

    if (!window.userApi) {
        try {
            const { followUser, unfollowUser } = await import('../APIs/userApi.js');
            window.userApi = { followUser, unfollowUser };
        } catch (e) {
            console.error('Error: API de usuario no cargada.');
            return;
        }
    }

    // UI Optimista
    buttonElement.disabled = true;
    const originalHTML = buttonElement.innerHTML;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        if (isFollowing) {
            // ➖ DEJAR DE SEGUIR
            await window.userApi.unfollowUser(userId);
            currentState.followingUsers.delete(targetId); 

            // Actualizar botón visualmente
            buttonElement.classList.remove('following');
            buttonElement.classList.add('follow');
            // Si es el botón pequeño de la reseña o el grande del buscador
            if (buttonElement.classList.contains('follow-btn-small')) {
                buttonElement.innerHTML = `<i class="fas fa-user-plus"></i> Seguir`;
            } else {
                buttonElement.innerHTML = `<i class="fas fa-user-plus"></i> Seguir`;
            }
            buttonElement.title = "Seguir";
            
        } else {
            // ➕ SEGUIR
            await window.userApi.followUser(userId);
            currentState.followingUsers.add(targetId); 
            
            buttonElement.classList.add('following');
            buttonElement.classList.remove('follow');
            if (buttonElement.classList.contains('follow-btn-small')) {
                buttonElement.innerHTML = `<i class="fas fa-user-check"></i> Siguiendo`;
            } else {
                buttonElement.innerHTML = `<i class="fas fa-user-check"></i> Siguiendo`;
            }
            buttonElement.title = "Dejar de seguir";
        }

        // Recargar feed si estamos en la página de amigos
        if (state && typeof state.loadReviews === 'function') {
            setTimeout(() => state.loadReviews(), 100); 
        }

    } catch (error) {
        // Manejo de conflicto (Ya seguido)
        if (error.response && error.response.status === 409) {
            console.warn(`Sincronizando: Ya seguías a ${username}.`);
            currentState.followingUsers.add(targetId);
            buttonElement.classList.add('following');
            buttonElement.innerHTML = `<i class="fas fa-user-check"></i> Siguiendo`;
        } else {
            console.error(`Error en toggleFollow:`, error);
            buttonElement.innerHTML = originalHTML;
        }
    } finally {
        buttonElement.disabled = false;
    }
}

// --- LÓGICA DE BÚSQUEDA CON FILTRO DE USUARIO PROPIO ---

async function executeUserSearch(query, state) {
    const userSearchResults = document.getElementById('userSearchResults');
    if (!userSearchResults) return;

    userSearchResults.style.display = 'block';
    userSearchResults.innerHTML = `<div class="p-3 text-center text-white"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>`;

    try {
        const targetState = state || globalState;
        const users = await searchUsers(query);

        if (!users || users.length === 0) {
            userSearchResults.innerHTML = `<div class="p-3 text-center text-white">No se encontraron usuarios.</div>`;
            return;
        }

        // === FILTRO DEL PROPIO USUARIO ===
        const currentUserId = normalizeId(localStorage.getItem('userId'));

        const normalizedUsers = users
            .filter(u => {
                // Filtramos si el ID del resultado es igual al mío
                const uId = u.userId || u.UserId || u.id;
                return normalizeId(uId) !== currentUserId;
            })
            .map(u => {
                const resolvedId = u.userId || u.UserId || u.id;
                const cleanId = normalizeId(resolvedId);
                
                // Verificamos contra el Set global
                const isFollowing = targetState.followingUsers ? targetState.followingUsers.has(cleanId) : false;
                
                return {
                    userId: resolvedId,
                    username: u.username,
                    imgProfile: u.imgProfile,
                    bio: u.bio,
                    isFollowing: isFollowing
                };
            });

        if (normalizedUsers.length === 0) {
            // Caso especial: si el único resultado era yo mismo
            userSearchResults.innerHTML = `<div class="p-3 text-center text-white">No se encontraron otros usuarios.</div>`;
            return;
        }

        userSearchResults.innerHTML = normalizedUsers.map(user => renderAmigoCard(user)).join('');
        
        attachFollowButtonListeners(userSearchResults, targetState);
        attachProfileRedirectionListeners(userSearchResults);

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

function attachProfileRedirectionListeners(container) {
    const cards = container.querySelectorAll('.user-result-item');
    cards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            if (e.target.closest('.follow-btn') || e.target.closest('button')) return;
            
            const followBtn = card.querySelector('.follow-btn');
            if (followBtn) {
                const userId = followBtn.getAttribute('data-user-id');
                if (userId) window.location.href = `profile.html?userId=${userId}`;
            }
        });
    });
}

// --- INICIALIZADORES ---

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

    // Botón Seguir PEQUEÑO (Reseñas)
    reviewsListElement.querySelectorAll('.follow-btn-small').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const userId = this.getAttribute('data-user-id');
            const username = this.getAttribute('data-username');
            toggleFollow(userId, username || 'Usuario', this, state);
        });
    });

    // Botón Seguir GRANDE (Tarjetas de amigos)
    reviewsListElement.querySelectorAll('.review-follow-btn, .follow-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.getAttribute('data-user-id');
            const username = this.getAttribute('data-username');
            toggleFollow(userId, username, this, state);
        });
    });

    reviewsListElement.querySelectorAll('.btn-like').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (window.handleLikeToggle) window.handleLikeToggle(e);
        });
    });

    reviewsListElement.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.getAttribute('data-review-id');
            if (window.showCommentsModal) window.showCommentsModal(id);
        });
    });
    
    reviewsListElement.querySelectorAll('.review-clickable').forEach(div => {
        div.addEventListener('click', function(e) {
            if (e.target.closest('button') || e.target.closest('.follow-btn-small')) return;
            const id = this.getAttribute('data-review-id');
            if (window.showReviewDetailModal) window.showReviewDetailModal(id);
        });
    });

    reviewsListElement.querySelectorAll('.btn-edit').forEach(btn => {
         btn.addEventListener('click', function() {
            const id = this.getAttribute('data-review-id');
             if (typeof window.toggleReviewEditMode === 'function') window.toggleReviewEditMode(id);
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

// --- INICIALIZACIÓN DE DATOS (Corrección Crítica) ---
export async function initializeFollowData(state) {
    const targetState = state || globalState;
    
    try {
        // 1. Obtenemos los datos crudos
        const [followersData, followingData] = await Promise.all([
            getFollowers(), 
            getFollowing()
        ]);

        // 2. Usamos cleanList para extraer los IDs sea cual sea el formato que venga
        targetState.followerUsers = new Set(cleanList(followersData));
        targetState.followingUsers = new Set(cleanList(followingData));
        
        if (targetState === globalState) targetState.isInitialized = true;

        console.log(`✅ Estado inicializado. Sigues a: ${targetState.followingUsers.size}`);
    } catch (e) {
        console.error('Error inicializando datos de seguimiento:', e);
        targetState.followerUsers = new Set();
        targetState.followingUsers = new Set();
    }
}

// Función auxiliar para verificar estado rápidamente
export function isFollowingUser(userId) {
    return globalState.followingUsers.has(normalizeId(userId));
}

export const AmigosHandler = {
    init: async (state) => {
        await initializeFollowData(globalState);
        if (state) {
            await initializeFollowData(state);
            initializeUserSearch(state);
            initializeReviewFilters(state);
        }
    },
    toggleFollow,
    addReviewEventListeners,
    initializeFollowData,
    isFollowingUser
};