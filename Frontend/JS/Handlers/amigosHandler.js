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
export async function toggleFollow(userId, username, buttonElement, state) {
    const isFollowing = state ? state.followingUsers.has(userId) : buttonElement.classList.contains('following');

    if (!window.userApi || !window.userApi.unfollowUser || !window.userApi.followUser) {
        alert('Error: La API de usuario no está disponible.');
        return;
    }

    buttonElement.disabled = true;
    const originalHTML = buttonElement.innerHTML;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        if (isFollowing) {
            await window.userApi.unfollowUser(userId);
            if (state) state.followingUsers.delete(userId);
            
            buttonElement.classList.remove('following');
            buttonElement.classList.add('follow');
            buttonElement.innerHTML = `<i class="fas fa-user-plus"></i> Seguir`;
            
        } else {
            await window.userApi.followUser(userId);
            if (state) state.followingUsers.add(userId);
            
            buttonElement.classList.remove('follow');
            buttonElement.classList.add('following');
            buttonElement.innerHTML = `<i class="fas fa-user-check"></i> Siguiendo`;
        }

        if (state && typeof state.loadReviews === 'function') {
            state.loadReviews(); 
        }

    } catch (error) {
        console.error(`Error follow/unfollow ${username}:`, error);
        alert(`No se pudo completar la acción.`);
        buttonElement.innerHTML = originalHTML;
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
        const users = await searchUsers(query);

        if (!users || users.length === 0) {
            userSearchResults.innerHTML = `<div class="p-3 text-center text-white">No se encontraron usuarios.</div>`;
        } else {
            userSearchResults.innerHTML = users.map(user => {
                const isFollowing = state ? state.followingUsers.has(user.id) : false;
                return renderAmigoCard({ ...user, isFollowing }); 
            }).join('');

            attachFollowButtonListeners(userSearchResults, state);
        }
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

    userSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (userSearchClear) userSearchClear.style.display = query ? 'block' : 'none';
        
        if (!query) {
            if (userSearchResults) userSearchResults.style.display = 'none';
            return;
        }
        debounce(() => executeUserSearch(query, state))();
    });

    if (userSearchClear) {
        userSearchClear.addEventListener('click', () => {
            userSearchInput.value = '';
            if (userSearchResults) userSearchResults.style.display = 'none';
            userSearchClear.style.display = 'none';
        });
    }

    document.addEventListener('click', (e) => {
        if (userSearchInput && userSearchResults && !userSearchInput.contains(e.target) && !userSearchResults.contains(e.target)) {
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
        // Cargar seguidores
        const followers = await getFollowers();
        state.followerUsers.clear();
        followers.forEach(id => state.followerUsers.add(id));

        // Cargar seguidos
        const following = await getFollowing();
        state.followingUsers.clear();
        following.forEach(id => state.followingUsers.add(id));
        
        console.log(`Datos de seguimiento cargados. Sigues a: ${state.followingUsers.size}, Te siguen: ${state.followerUsers.size}`);
    } catch (e) {
        console.error('Error cargando datos de seguimiento:', e);
    }
}
export const AmigosHandler = {
    init: (state) => {
        initializeUserSearch(state); 
        initializeReviewFilters(state); 
    },
    addReviewEventListeners: addReviewEventListeners,
    initializeFollowData: initializeFollowData
};

export function showReviewDetailModal(reviewId) { console.log("Modal Stub", reviewId); }
export function showLoginRequiredModal() { alert("Inicia sesión."); }