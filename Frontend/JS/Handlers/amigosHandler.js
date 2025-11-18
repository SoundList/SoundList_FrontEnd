
import { AmigosApi } from '../APIs/AmigosApi.js';
import { ReviewApi } from '../APIs/reviewApi.js'; 
import { renderAmigoCard } from '../Components/reviews/amigoCard.js'; 
import { renderReviewCard } from '../Components/reviews/reviewCard.js'; 

export const AmigosHandler = {
    
    init: () => {
        const searchInput = document.getElementById('userSearchInput');
        const searchResults = document.getElementById('userSearchResults');
        const searchClear = document.getElementById('userSearchClear');
        const filterBtns = document.querySelectorAll('.filter-btn');

        let timeoutId;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                if (searchClear) searchClear.style.display = query ? 'block' : 'none';
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => { 
                    AmigosHandler.handleSearch(query); 
                }, 500);
            });
        }

        if (searchClear) {
            searchClear.addEventListener('click', () => {
                searchInput.value = '';
                searchResults.innerHTML = '';
                searchResults.style.display = 'none';
                searchClear.style.display = 'none';
            });
        }

        document.addEventListener('click', async (e) => {
            const btn = e.target.closest('.follow-btn');
            if (btn) {
                e.preventDefault();
                const userId = btn.dataset.userId;
                const isFollowing = btn.classList.contains('following');
                await AmigosHandler.toggleFollow(userId, isFollowing, btn);
            }
        });

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                AmigosHandler.loadReviewFeed(btn.dataset.filter); 
            });
        });
    },
    handleSearch: async (query) => {
        const resultsContainer = document.getElementById('userSearchResults');
        if (!query) {
            resultsContainer.style.display = 'none';
            return;
        }

        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = '<div class="p-3 text-center text-white">Buscando usuarios...</div>';

        const rawUsers = await AmigosApi.searchUsers(query);
        const rawFollowing = await AmigosApi.getFollowing();
        const users = Array.isArray(rawUsers) ? rawUsers : [];
        const myFollowing = Array.isArray(rawFollowing) ? rawFollowing : [];

        if (users.length === 0) {
            resultsContainer.innerHTML = '<div class="p-3 text-center text-white">No se encontraron usuarios.</div>';
            return;
        }

        resultsContainer.innerHTML = users.map(user => {
            const isFollowing = myFollowing.some(u => u.id === user.id);
            return renderAmigoCard({ ...user, isFollowing });
        }).join('');
    },

    toggleFollow: async (userId, isUnfollowing, btnElement) => {
        btnElement.disabled = true;
        const originalHTML = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        let success = isUnfollowing 
            ? await AmigosApi.unfollowUser(userId) 
            : await AmigosApi.followUser(userId);

        if (success) {
            if (isUnfollowing) {
                btnElement.className = 'follow-btn follow';
                btnElement.innerHTML = '<i class="fas fa-user-plus"></i> Seguir';
            } else {
                btnElement.className = 'follow-btn following';
                btnElement.innerHTML = '<i class="fas fa-user-check"></i> Siguiendo';
            }
        } else {
            alert('Error al realizar la acción. Intenta de nuevo.');
            btnElement.innerHTML = originalHTML;
        }
        btnElement.disabled = false;
    },
    loadReviewFeed: async (type) => { 
        const listContainer = document.getElementById('reviewsList'); 
        const emptyState = document.getElementById('reviewsEmpty');
        
        listContainer.innerHTML = '<div class="text-center text-white mt-4"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
        if (emptyState) emptyState.style.display = 'none';

        let rawReviews = [];
        try {
            if (type === 'seguidos') {
                console.log("Cargando reseñas de seguidos...");
                rawReviews = await ReviewApi.getReviewsByFollowing();
            } else {
                console.log("Cargando reseñas de seguidores...");
                rawReviews = await ReviewApi.getReviewsByFollowers();
            }
        } catch (e) {
            console.warn("Error cargando reseñas:", e);
            rawReviews = [];
        }

        const reviews = Array.isArray(rawReviews) ? rawReviews : [];

        listContainer.innerHTML = '';

        if (reviews.length === 0) {
            if (emptyState) {
                emptyState.style.display = 'flex';
                emptyState.querySelector('p').textContent = type === 'seguidos' 
                    ? 'Las personas que sigues aún no han escrito reseñas.' 
                    : 'Tus seguidores aún no han escrito reseñas.';
            }
            return;
        }
        const cardsHTML = reviews.map(review => {
            return renderReviewCard(review); 
        }).join('');

        listContainer.innerHTML = cardsHTML;
    },
    
    loadUserList: (type) => AmigosHandler.loadReviewFeed(type)
};