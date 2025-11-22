import { searchUsers, getFollowing, getFollowers } from '../APIs/AmigosApi.js';
import { renderAmigoCard } from '../Components/amigoCard.js';

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

function cleanList(list) {
    if (!Array.isArray(list)) return [];
    return list.map(item => {

        if (typeof item === 'string') return normalizeId(item);

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

    if (!currentState.followingUsers || currentState.followingUsers.size === 0) {
        await initializeFollowData(currentState);
    }

    const targetId = normalizeId(userId);
    const isFollowing = currentState.followingUsers.has(targetId);
    const targetUser = username || 'al usuario'; // Fallback por si no llega el nombre

    if (!window.userApi) {
        try {
            const { followUser, unfollowUser } = await import('../APIs/userApi.js');
            window.userApi = { followUser, unfollowUser };
        } catch (e) {
            console.error('Error: API de usuario no cargada.');
            if (window.showAlert) window.showAlert('Error interno: No se pudo conectar con el servicio.', 'danger');
            return;
        }
    }

    buttonElement.disabled = true;
    const originalHTML = buttonElement.innerHTML;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        if (isFollowing) {
            // ➖ DEJAR DE SEGUIR
            await window.userApi.unfollowUser(userId);
            currentState.followingUsers.delete(targetId); 

            // Actualizar botón
            buttonElement.classList.remove('following');
            buttonElement.classList.add('follow');
            
            if (buttonElement.classList.contains('follow-btn-small')) {
                buttonElement.innerHTML = `<i class="fas fa-user-plus"></i> Seguir`;
            } else {
                buttonElement.innerHTML = `<i class="fas fa-user-plus"></i> Seguir`;
            }
            buttonElement.title = "Seguir";

            if (window.showAlert) {
                window.showAlert(`Dejaste de seguir a ${targetUser}`, 'warning'); // Usa estilo naranja/amarillo
            }
            
        } else {
            // ➕ SEGUIR
            await window.userApi.followUser(userId);
            currentState.followingUsers.add(targetId); 
            
            // Actualizar botón
            buttonElement.classList.add('following');
            buttonElement.classList.remove('follow');
            
            if (buttonElement.classList.contains('follow-btn-small')) {
                buttonElement.innerHTML = `<i class="fas fa-user-check"></i> Siguiendo`;
            } else {
                buttonElement.innerHTML = `<i class="fas fa-user-check"></i> Siguiendo`;
            }
            buttonElement.title = "Dejar de seguir";

            if (window.showAlert) {
                window.showAlert(`Ahora sigues a ${targetUser}`, 'success'); // Usa estilo morado/verde
            }
        }

        if (state && typeof state.loadReviews === 'function') {
            setTimeout(() => state.loadReviews(), 100); 
        }

    } catch (error) {

        if (error.response && error.response.status === 409) {
            console.warn(`Sincronizando: Ya seguías a ${username}.`);
            currentState.followingUsers.add(targetId);
            buttonElement.classList.add('following');
            buttonElement.innerHTML = `<i class="fas fa-user-check"></i> Siguiendo`;

            if (window.showAlert) window.showAlert(`Ya seguías a ${targetUser}`, 'info');

        } else {
            console.error(`Error en toggleFollow:`, error);
            buttonElement.innerHTML = originalHTML; 

            if (window.showAlert) {
                window.showAlert('No se pudo completar la acción. Intenta nuevamente.', 'danger');
            }
        }
    } finally {
        buttonElement.disabled = false;
    }
}

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

        const currentUserId = normalizeId(localStorage.getItem('userId'));

        const normalizedUsers = users
            .filter(u => {
                const uId = u.userId || u.UserId || u.id;
                return normalizeId(uId) !== currentUserId;
            })
            .map(u => {
                const resolvedId = u.userId || u.UserId || u.id;
                const cleanId = normalizeId(resolvedId);
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
    reviewsListElement.querySelectorAll('.follow-btn-small').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const userId = this.getAttribute('data-user-id');
            const username = this.getAttribute('data-username');
            toggleFollow(userId, username || 'Usuario', this, state);
        });
    });

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

export async function initializeFollowData(state) {
    const targetState = state || globalState;
    
    try {
        const [followersData, followingData] = await Promise.all([
            getFollowers(), 
            getFollowing()
        ]);

        targetState.followerUsers = new Set(cleanList(followersData));
        targetState.followingUsers = new Set(cleanList(followingData));
        
        if (targetState === globalState) targetState.isInitialized = true;

        console.log(` Estado inicializado. Sigues a: ${targetState.followingUsers.size}`);
    } catch (e) {
        console.error('Error inicializando datos de seguimiento:', e);
        targetState.followerUsers = new Set();
        targetState.followingUsers = new Set();
    }
}

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