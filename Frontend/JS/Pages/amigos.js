// Amigos Page JavaScript - Mock Implementation

// Global variables
let currentReviewFilter = 'amigos'; // 'amigos', 'seguidos', 'random'
let mockUsers = [];
let mockReviews = [];
let followingUsers = new Set(); // Usuarios que el usuario actual sigue
let mutualFriends = new Set(); // Amigos mutuos (seguimiento mutuo)

// Mock data - Usuarios
const mockUsersData = [
    {
        id: 'user1',
        username: 'musiclover23',
        bio: 'Amante de la música indie y rock alternativo 🎸',
        avatar: '../Assets/default-avatar.png',
        isFollowing: false,
        isMutualFriend: false
    },
    {
        id: 'user2',
        username: 'vinyl_collector',
        bio: 'Coleccionista de vinilos desde 2010. Compartiendo mis descubrimientos musicales.',
        avatar: '../Assets/default-avatar.png',
        isFollowing: true,
        isMutualFriend: true
    },
    {
        id: 'user3',
        username: 'jazz_night',
        bio: 'Jazz, blues y soul. Siempre buscando nuevos sonidos.',
        avatar: '../Assets/default-avatar.png',
        isFollowing: true,
        isMutualFriend: false
    },
    {
        id: 'user4',
        username: 'pop_enthusiast',
        bio: 'Pop, K-pop y todo lo que suene bien 🎵',
        avatar: '../Assets/default-avatar.png',
        isFollowing: false,
        isMutualFriend: false
    },
    {
        id: 'user5',
        username: 'metalhead99',
        bio: 'Heavy metal, thrash, death metal. Headbanging since 1999 🤘',
        avatar: '../Assets/default-avatar.png',
        isFollowing: false,
        isMutualFriend: false
    },
    {
        id: 'user6',
        username: 'electronic_dreams',
        bio: 'Electronic music producer. Sharing my favorite tracks.',
        avatar: '../Assets/default-avatar.png',
        isFollowing: true,
        isMutualFriend: true
    }
];

// Mock data - Reseñas
const mockReviewsData = [
    {
        id: 'review1',
        userId: 'user2',
        username: 'vinyl_collector',
        avatar: '../Assets/default-avatar.png',
        contentType: 'song',
        song: 'Bohemian Rhapsody',
        artist: 'Queen',
        title: 'Una obra maestra atemporal',
        comment: 'Esta canción nunca deja de sorprenderme. La combinación de ópera, rock y balada es simplemente genial.',
        rating: 5,
        likes: 45,
        comments: 12,
        userLiked: false,
        isMutualFriend: true,
        isFollowing: true
    },
    {
        id: 'review2',
        userId: 'user3',
        username: 'jazz_night',
        avatar: '../Assets/default-avatar.png',
        contentType: 'album',
        song: 'Kind of Blue',
        artist: 'Miles Davis',
        title: 'El álbum de jazz más importante',
        comment: 'Cada vez que lo escucho descubro algo nuevo. La improvisación es perfecta.',
        rating: 5,
        likes: 38,
        comments: 8,
        userLiked: true,
        isMutualFriend: false,
        isFollowing: true
    },
    {
        id: 'review3',
        userId: 'user1',
        username: 'musiclover23',
        avatar: '../Assets/default-avatar.png',
        contentType: 'song',
        song: 'Stairway to Heaven',
        artist: 'Led Zeppelin',
        title: 'La mejor canción de rock de todos los tiempos',
        comment: 'Desde el inicio acústico hasta el solo épico, esta canción es perfecta.',
        rating: 5,
        likes: 52,
        comments: 15,
        userLiked: false,
        isMutualFriend: false,
        isFollowing: false
    },
    {
        id: 'review4',
        userId: 'user6',
        username: 'electronic_dreams',
        avatar: '../Assets/default-avatar.png',
        contentType: 'album',
        song: 'Random Access Memories',
        artist: 'Daft Punk',
        title: 'Un viaje sonoro increíble',
        comment: 'La producción es impecable. Cada track es una experiencia única.',
        rating: 4.5,
        likes: 29,
        comments: 6,
        userLiked: false,
        isMutualFriend: true,
        isFollowing: true
    },
    {
        id: 'review5',
        userId: 'user4',
        username: 'pop_enthusiast',
        avatar: '../Assets/default-avatar.png',
        contentType: 'song',
        song: 'Blinding Lights',
        artist: 'The Weeknd',
        title: 'Adictivo desde el primer segundo',
        comment: 'No puedo dejar de escucharla. El synth es increíble.',
        rating: 4,
        likes: 33,
        comments: 9,
        userLiked: false,
        isMutualFriend: false,
        isFollowing: false
    },
    {
        id: 'review6',
        userId: 'user5',
        username: 'metalhead99',
        avatar: '../Assets/default-avatar.png',
        contentType: 'album',
        song: 'Master of Puppets',
        artist: 'Metallica',
        title: 'Thrash metal en su máxima expresión',
        comment: 'Este álbum define el thrash metal. Riffs increíbles y energía pura.',
        rating: 5,
        likes: 41,
        comments: 11,
        userLiked: true,
        isMutualFriend: false,
        isFollowing: false
    }
];

// Initialize following users from mock data
mockUsersData.forEach(user => {
    if (user.isFollowing) {
        followingUsers.add(user.id);
    }
    if (user.isMutualFriend) {
        mutualFriends.add(user.id);
    }
});

// Initialize mock data
mockUsers = [...mockUsersData];
mockReviews = [...mockReviewsData];

// Función de inicialización exportada para main.js
export function initializeAmigosPage() {
    initializeUserSearch();
    initializeReviewFilters();
    initializeReviews();
    // No inicializar navegación ni loadUserData aquí, se hace en headerHandler.js
    
    // Load initial reviews
    loadReviews();
}

// Mantener compatibilidad con carga directa
document.addEventListener('DOMContentLoaded', function() {
    // Solo inicializar si no se ha llamado desde main.js
    if (typeof initializeAmigosPage === 'function' && !window.amigosPageInitialized) {
        initializeAmigosPage();
        window.amigosPageInitialized = true;
    }
});

// User Search Functionality
function initializeUserSearch() {
    const userSearchInput = document.getElementById('userSearchInput');
    const userSearchClear = document.getElementById('userSearchClear');
    const userSearchResults = document.getElementById('userSearchResults');
    
    if (!userSearchInput) return;
    
    let searchTimeout;
    
    userSearchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        
        clearTimeout(searchTimeout);
        
        if (query.length === 0) {
            userSearchResults.style.display = 'none';
            userSearchClear.style.display = 'none';
            return;
        }
        
        userSearchClear.style.display = 'block';
        
        // Debounce search
        searchTimeout = setTimeout(() => {
            searchUsers(query);
        }, 300);
    });
    
    userSearchClear.addEventListener('click', function() {
        userSearchInput.value = '';
        userSearchResults.style.display = 'none';
        this.style.display = 'none';
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!userSearchInput.contains(e.target) && 
            !userSearchResults.contains(e.target) && 
            !userSearchClear.contains(e.target)) {
            // Keep results visible if there's a query
            if (userSearchInput.value.trim().length > 0) {
                return;
            }
            userSearchResults.style.display = 'none';
        }
    });
}

function searchUsers(query) {
    const userSearchResults = document.getElementById('userSearchResults');
    if (!userSearchResults) return;
    
    // Mock search - filter users by username or bio
    const filteredUsers = mockUsers.filter(user => 
        user.username.toLowerCase().includes(query) ||
        user.bio.toLowerCase().includes(query)
    );
    
    if (filteredUsers.length === 0) {
        userSearchResults.innerHTML = `
            <div class="user-search-empty">
                <i class="fas fa-user-slash"></i>
                <p>No se encontraron usuarios</p>
            </div>
        `;
    } else {
        userSearchResults.innerHTML = filteredUsers.map(user => {
            const isFollowing = followingUsers.has(user.id);
            return `
                <div class="user-result-item" data-user-id="${user.id}">
                    <img src="${user.avatar}" alt="${user.username}" class="user-result-avatar" 
                         onerror="this.src='../Assets/default-avatar.png'">
                    <div class="user-result-info">
                        <div class="user-result-username">${user.username}</div>
                        <div class="user-result-bio">${user.bio}</div>
                    </div>
                    <div class="user-result-actions">
                        <button class="follow-btn ${isFollowing ? 'following' : 'follow'}" 
                                data-user-id="${user.id}"
                                data-username="${user.username}">
                            <i class="fas ${isFollowing ? 'fa-user-check' : 'fa-user-plus'}"></i>
                            ${isFollowing ? 'Siguiendo' : 'Seguir'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners for follow buttons
        userSearchResults.querySelectorAll('.follow-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const userId = this.getAttribute('data-user-id');
                const username = this.getAttribute('data-username');
                toggleFollow(userId, username, this);
            });
        });
    }
    
    userSearchResults.style.display = 'block';
}

async function toggleFollow(userId, username, buttonElement) {
    const isFollowing = followingUsers.has(userId);
    
    try {
        if (isFollowing) {
            // Dejar de seguir
            await window.userApi.unfollowUser(userId);
            followingUsers.delete(userId);
            mutualFriends.delete(userId);
            buttonElement.classList.remove('following');
            buttonElement.classList.add('follow');
            buttonElement.innerHTML = `
                <i class="fas fa-user-plus"></i>
                Seguir
            `;
            console.log(`✅ Dejaste de seguir a ${username}`);
        } else {
            // Seguir
            await window.userApi.followUser(userId);
            followingUsers.add(userId);
            // Check if it's a mutual friend (mock logic - podría mejorarse con API real)
            const user = mockUsers.find(u => u.id === userId);
            if (user && user.isMutualFriend) {
                mutualFriends.add(userId);
            }
            buttonElement.classList.remove('follow');
            buttonElement.classList.add('following');
            buttonElement.innerHTML = `
                <i class="fas fa-user-check"></i>
                Siguiendo
            `;
            console.log(`✅ Ahora sigues a ${username}`);
        }
        
        // Reload reviews to reflect follow status
        loadReviews();
    } catch (error) {
        console.error(`❌ Error al ${isFollowing ? 'dejar de seguir' : 'seguir'} a ${username}:`, error);
        // Mostrar mensaje de error al usuario
        alert(`Error al ${isFollowing ? 'dejar de seguir' : 'seguir'} a ${username}. Por favor, intenta de nuevo.`);
    }
}

// Review Filters
function initializeReviewFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update current filter
            currentReviewFilter = this.getAttribute('data-filter');
            
            // Reload reviews
            loadReviews();
        });
    });
}

// Reviews Functionality
function initializeReviews() {
    // Reviews will be loaded by loadReviews()
}

function loadReviews() {
    const reviewsList = document.getElementById('reviewsList');
    const reviewsEmpty = document.getElementById('reviewsEmpty');
    
    if (!reviewsList) return;
    
    // Filter reviews based on current filter
    let filteredReviews = [];
    
    switch (currentReviewFilter) {
        case 'amigos':
            // Reseñas de amigos mutuos (seguimiento mutuo)
            filteredReviews = mockReviews.filter(review => 
                mutualFriends.has(review.userId)
            );
            break;
        case 'seguidos':
            // Reseñas de usuarios que sigues
            filteredReviews = mockReviews.filter(review => 
                followingUsers.has(review.userId) && !mutualFriends.has(review.userId)
            );
            break;
        case 'random':
            // Reseñas de usuarios que NO sigues (descubrir)
            filteredReviews = mockReviews.filter(review => 
                !followingUsers.has(review.userId)
            );
            break;
        default:
            filteredReviews = mockReviews;
    }
    
    if (filteredReviews.length === 0) {
        reviewsList.style.display = 'none';
        if (reviewsEmpty) {
            reviewsEmpty.style.display = 'block';
        }
        return;
    }
    
    reviewsList.style.display = 'block';
    if (reviewsEmpty) {
        reviewsEmpty.style.display = 'none';
    }
    
    // Render reviews
    renderReviews(filteredReviews);
}

function renderReviews(reviews) {
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return;
    
    const currentUserId = localStorage.getItem('userId');
    const isLoggedIn = currentUserId !== null;
    const defaultAvatar = '../Assets/default-avatar.png';
    
    reviewsList.innerHTML = reviews.map(review => {
        const isLiked = review.userLiked || false;
        const likeCount = review.likes || 0;
        const commentCount = review.comments || 0;
        const isFollowingUser = followingUsers.has(review.userId);
        const isOwnReview = currentUserId && (review.userId === currentUserId);
        
        return `
            <div class="review-item" data-review-id="${review.id}">
                <div class="review-user review-clickable" data-review-id="${review.id}" style="cursor: pointer;">
                    <img src="${review.avatar || defaultAvatar}" 
                         alt="${review.username}" 
                         class="review-avatar"
                         onerror="this.src='${defaultAvatar}'">
                    <div class="review-info">
                        <div class="review-header">
                            <span class="review-username">${review.username}</span>
                            <span class="review-separator">-</span>
                            <span class="review-content-type">${review.contentType === 'song' ? 'Canción' : 'Álbum'}</span>
                            <span class="review-separator">-</span>
                            <span class="review-song">${review.song}</span>
                            <span class="review-separator">-</span>
                            <span class="review-artist">${review.artist}</span>
                        </div>
                        ${review.title ? `<h4 class="review-title">${review.title}</h4>` : ''}
                        <p class="review-comment">${review.comment}</p>
                    </div>
                </div>
                <div class="review-actions">
                    <div class="review-rating">
                        <div class="review-stars">
                            ${renderStars(review.rating)}
                        </div>
                    </div>
                    <div class="review-interactions">
                        ${!isOwnReview && isLoggedIn ? `
                            <button class="review-follow-btn ${isFollowingUser ? 'following' : ''}" 
                                    data-user-id="${review.userId}"
                                    data-username="${review.username}">
                                <i class="fas ${isFollowingUser ? 'fa-user-check' : 'fa-user-plus'}"></i>
                                ${isFollowingUser ? 'Siguiendo' : 'Seguir'}
                            </button>
                        ` : ''}
                        <button class="review-btn btn-like ${isLiked ? 'liked' : ''}" 
                                data-review-id="${review.id}"
                                title="${!isLoggedIn ? 'Inicia sesión para dar Me Gusta' : ''}">
                            <i class="fas fa-heart"></i>
                            <span>${likeCount}</span>
                        </button>
                        <button class="review-btn comment-btn" 
                                data-review-id="${review.id}"
                                title="Ver comentarios">
                            <i class="fas fa-comment"></i>
                            <span>${commentCount}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners
    addReviewEventListeners();
}

function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<span class="star full-star">★</span>';
    }
    
    if (hasHalfStar) {
        stars += '<span class="star half-star">★</span>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
        stars += '<span class="star empty-star">★</span>';
    }
    
    return stars;
}

function addReviewEventListeners() {
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return;
    
    // Follow buttons in reviews
    reviewsList.querySelectorAll('.review-follow-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.getAttribute('data-user-id');
            const username = this.getAttribute('data-username');
            toggleFollow(userId, username, this);
        });
    });
    
    // Like buttons
    reviewsList.querySelectorAll('.btn-like').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const reviewId = this.getAttribute('data-review-id');
            toggleLike(reviewId, this);
        });
    });
    
    // Comment buttons
    reviewsList.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const reviewId = this.getAttribute('data-review-id');
            // Mock: Just show alert for now
            alert('Funcionalidad de comentarios - Mock (se implementará más adelante)');
        });
    });
    
    // Review click to open detail
    reviewsList.querySelectorAll('.review-clickable').forEach(element => {
        element.addEventListener('click', function() {
            const reviewId = this.getAttribute('data-review-id');
            // Mock: Just show alert for now
            alert('Vista detallada de reseña - Mock (se implementará más adelante)');
        });
    });
}

function toggleLike(reviewId, buttonElement) {
    const isLiked = buttonElement.classList.contains('liked');
    const likeSpan = buttonElement.querySelector('span');
    const currentLikes = parseInt(likeSpan.textContent) || 0;
    
    if (isLiked) {
        buttonElement.classList.remove('liked');
        likeSpan.textContent = Math.max(0, currentLikes - 1);
    } else {
        buttonElement.classList.add('liked');
        likeSpan.textContent = currentLikes + 1;
    }
    
    // Update mock data
    const review = mockReviews.find(r => r.id === reviewId);
    if (review) {
        review.userLiked = !isLiked;
        review.likes = parseInt(likeSpan.textContent);
    }
}

// Navigation (reusing from home.js pattern)
// La navegación ahora se maneja en headerHandler.js
// Esta función se mantiene por compatibilidad pero no se usa si headerHandler.js está cargado
function initializeNavigation() {
    // Navigation buttons - solo si headerHandler no está disponible
    if (typeof initializeHeader === 'undefined') {
        const navButtons = document.querySelectorAll('.nav-btn, .mobile-nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const page = this.getAttribute('data-page');
                if (page === 'inicio') {
                    window.location.href = 'home.html';
                } else if (page === 'rankings') {
                    // Mock: Just show alert
                    alert('Vista de Rankings - Mock (se implementará más adelante)');
                } else if (page === 'amigos') {
                    // Already on amigos page
                }
            });
        });
        
        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const mobileNavMenu = document.getElementById('mobileNavMenu');
        
        if (mobileMenuToggle && mobileNavMenu) {
            mobileMenuToggle.addEventListener('click', function() {
                mobileNavMenu.style.display = mobileNavMenu.style.display === 'flex' ? 'none' : 'flex';
            });
        }
    }
}

// Load user data (reusing from home.js pattern)
function loadUserData() {
    const authToken = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    
    const loginContainer = document.getElementById('loginContainer');
    const profileContainer = document.getElementById('profileContainer');
    const notificationsContainer = document.getElementById('notificationsContainer');
    const addReviewContainer = document.getElementById('addReviewContainer');
    const usernameDisplay = document.getElementById('usernameDisplay');
    
    if (authToken && userId) {
        // User is logged in
        if (loginContainer) loginContainer.style.display = 'none';
        if (profileContainer) profileContainer.style.display = 'block';
        if (notificationsContainer) notificationsContainer.style.display = 'block';
        if (addReviewContainer) addReviewContainer.style.display = 'block';
        if (usernameDisplay && username) usernameDisplay.textContent = username;
        
        // Initialize profile dropdown
        initializeProfileDropdown();
    } else {
        // User is not logged in
        if (loginContainer) loginContainer.style.display = 'block';
        if (profileContainer) profileContainer.style.display = 'none';
        if (notificationsContainer) notificationsContainer.style.display = 'none';
        if (addReviewContainer) addReviewContainer.style.display = 'none';
        
        // Login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', function() {
                window.location.href = 'login.html';
            });
        }
    }
}

function initializeProfileDropdown() {
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            profileDropdown.style.display = profileDropdown.style.display === 'block' ? 'none' : 'block';
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.style.display = 'none';
            }
        });
        
        // Profile dropdown items
        const verPerfilBtn = document.getElementById('verPerfilBtn');
        const cerrarSesionBtn = document.getElementById('cerrarSesionBtn');
        
        if (verPerfilBtn) {
            verPerfilBtn.addEventListener('click', function() {
                // Mock: Just show alert for now
                alert('Vista de Perfil - Mock (se implementará más adelante)');
            });
        }
        
        if (cerrarSesionBtn) {
            cerrarSesionBtn.addEventListener('click', function() {
                localStorage.removeItem('authToken');
                localStorage.removeItem('userId');
                localStorage.removeItem('username');
                localStorage.removeItem('userAvatar');
                // Redirigir a login.html (estamos en HTML/, así que la ruta es directa)
                window.location.href = 'login.html';
            });
        }
    }
}

