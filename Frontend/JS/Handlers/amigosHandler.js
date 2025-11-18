import { searchUsers } from '../APIs/AmigosApi.js';
import { renderAmigoCard } from '../Components/amigoCard.js';
import { loadReviews, followingUsers, mutualFriends } from '../Pages/amigos.js'; 

// UTILIDAD: FUNCIÓN DE DEBOUNCE

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

// LÓGICA DE SEGUIMIENTO 
export async function toggleFollow(userId, username, buttonElement) {
    const isFollowing = followingUsers.has(userId);

    if (!window.userApi || !window.userApi.unfollowUser || !window.userApi.followUser) {
        alert('Error: La API de usuario no está disponible.');
        return;
    }

    buttonElement.disabled = true;

    try {
        if (isFollowing) {
            await window.userApi.unfollowUser(userId);
            followingUsers.delete(userId);
            mutualFriends.delete(userId); 
            buttonElement.classList.remove('following');
            buttonElement.classList.add('follow');
            buttonElement.innerHTML = `<i class="fas fa-user-plus"></i> Seguir`;
            
        } else {
            await window.userApi.followUser(userId);
            followingUsers.add(userId);
            buttonElement.classList.remove('follow');
            buttonElement.classList.add('following');
            buttonElement.innerHTML = `<i class="fas fa-user-check"></i> Siguiendo`;
        }

        loadReviews();

    } catch (error) {
        console.error(`❌ Error al ${isFollowing ? 'dejar de seguir' : 'seguir'} a ${username}:`, error.response?.data || error.message);
        alert(`Error al ${isFollowing ? 'dejar de seguir' : 'seguir'} a ${username}. Por favor, intenta de nuevo.`);
    } finally {
        buttonElement.disabled = false;
    }
}

// LÓGICA DE BÚSQUEDA (searchUsers)

async function executeUserSearch(query) {
    const userSearchResults = document.getElementById('userSearchResults');
    if (!userSearchResults) return;

    userSearchResults.style.display = 'block';
    userSearchResults.innerHTML = `<div class="user-search-loading"><p class="text-center text-light mt-3"><i class="fas fa-spinner fa-spin me-2"></i> Buscando...</p></div>`;

    let users = [];
    try {
        users = await searchUsers(query); 
    } catch (err) {
        console.error("❌ Error buscando usuarios:", err);
        userSearchResults.innerHTML = '<p class="text-danger text-center mt-4">Hubo un error al cargar los resultados.</p>';
        return;
    }

    if (users.length === 0) {
        userSearchResults.innerHTML = `
            <div class="user-search-empty">
                <i class="fas fa-user-slash"></i>
                <p>No se encontraron usuarios</p>
            </div>
        `;
    } else {
        userSearchResults.innerHTML = users.map(renderAmigoCard).join('');
        attachFollowButtonListeners(userSearchResults);
    }
}

function attachFollowButtonListeners(container) {
    container.querySelectorAll('.follow-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.getAttribute('data-user-id');
            const username = this.getAttribute('data-username');
            toggleFollow(userId, username, this); 
        });
    });
}

export function initializeUserSearch() {
    const userSearchInput = document.getElementById('userSearchInput');
    const userSearchClear = document.getElementById('userSearchClear');
    const userSearchResults = document.getElementById('userSearchResults');
    
    if (!userSearchInput) return;

    userSearchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        
        if (query.length === 0) {
            userSearchResults.style.display = 'none';
            userSearchClear.style.display = 'none';
            return;
        }
        
        userSearchClear.style.display = 'block';
        
        debounce(() => executeUserSearch(query))(); 
    });

    if (userSearchClear) {
        userSearchClear.addEventListener('click', function() {
            userSearchInput.value = '';
            userSearchResults.style.display = 'none';
            this.style.display = 'none';
            userSearchInput.dispatchEvent(new Event('input')); 
        });
    }

    document.addEventListener('click', function(e) {
        const isInput = userSearchInput.contains(e.target);
        const isResult = userSearchResults.contains(e.target);
        const isClear = userSearchClear && userSearchClear.contains(e.target);
        
        if (!isInput && !isResult && !isClear) {
            if (userSearchInput.value.trim().length === 0) {
                userSearchResults.style.display = 'none';
            }
        }
    });
}

export function initializeReviewFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            if (typeof loadReviews === 'function') { 
                loadReviews(this.getAttribute('data-filter')); 
            }
        });
    });
}