/*
 * JavaScript/Admin/homeAdmin.js
 *
 * Responsabilidad: Manejar toda la lógica Específica de la página de inicio (home.html).
 * - Controla el carrusel de rankings.
 * - Controla el feed principal de reseñas.
 * - Maneja todos los modals relacionados con reseñas (Crear, Editar, Comentarios, etc.)
 */

// --- 1. IMPORTACIONES DE API Y COMPONENTES ---
import { API_BASE_URL } from '../APIs/configApi.js';
import {
    getReviews,
    getReviewDetails,
    getCommentsByReview,
    createComment,
    updateComment,
    deleteComment,
    getReviewReactionCount,
    addReviewReaction,
    deleteReviewReaction,
    createReview,
    updateReview,
    deleteReview,
    getUser
} from '../APIs/socialApi.js';
import {
    getSongByApiId,
    getAlbumByApiId,
    getOrCreateSong, 
    getOrCreateAlbum
} from '../APIs/contentApi.js';
import { fetchSearchResults } from '../APIs/searchApi.js';

// (Idealmente, estas funciones de renderizado estarían en /Components/,
// pero por ahora las dejamos aquí como estaban en tu home.js)

// --- 2. VARIABLES GLOBALES (ESPECÍFICAS DEL HOME) ---
let currentReviewFilter = 'popular'; // Filtro actual de reseñas: 'popular' o 'recent'
let loadReviews = null; // Función para cargar reseñas (se asignará en initializeReviews)
let commentsData = {}; // Array para almacenar comentarios simulados (key: reviewId)
let currentReviewData = null; // Almacena datos del contenido para el modal "Crear Reseña"
let editingCommentId = null;
let originalCommentText = null;
let deletingReviewId = null;
let deletingCommentId = null;
let reportingCommentId = null;


// --- 3. PUNTO DE ENTRADA (LLAMADO POR MAIN.JS) ---

export function initializeHomePage() {
    console.log("Inicializando lógica de Home...");
    
    if (document.getElementById('carouselWrapper')) {
        initializeCarousel();
    }
    if (document.getElementById('reviewsList')) {
        initializeReviews();
        initializeCreateReviewModal(); 
        initializeSampleComments();
        
        initializeCommentsModalLogic();
        initializeReviewDetailModalLogic();
        initializeDeleteModalsLogic();
        initializeReportModalLogic();
    }
}


// --- 4. FUNCIONES GLOBALES DEL HOME (FILTRO Y ESTRELLAS) ---

function setReviewFilter(filter) {
    currentReviewFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    if (typeof loadReviews === 'function') {
        loadReviews();
    }
}

function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    let stars = '';
    for (let i = 0; i < fullStars; i++) { stars += '<span class="star full-star">★</span>'; }
    if (hasHalfStar) { stars += '<span class="star half-star">★</span>'; }
    for (let i = 0; i < emptyStars; i++) { stars += '<span class="star empty-star">★</span>'; }
    return stars;
}

// --- 5. LÓGICA DEL CARRUSEL ---

function initializeCarousel() {
    const carouselWrapper = document.getElementById('carouselWrapper');
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    const indicatorsContainer = document.getElementById('carouselIndicators');

    async function getMasRecomendado() {
            try {

                return {
                    totalSongs: 0, // Se actualizará con datos reales
                    minReviews: 10,
                    topSong: {
                        name: 'No hay datos aún',
                        artist: 'Crea reseñas para ver resultados',
                        avgRating: 0,
                        totalReviews: 0,
                        albumImage: null,
                        artistImage: null
                    }
                };
            } catch (error) {
                console.error('Error obteniendo más recomendado:', error);
                // Si falla, retornar datos vacíos en lugar de datos de ejemplo
                return {
                    totalSongs: 0,
                    minReviews: 10,
                    topSong: {
                        name: 'Error cargando datos',
                        artist: 'Intenta más tarde',
                        avgRating: 0,
                        totalReviews: 0,
                        albumImage: null,
                        artistImage: null
                    }
                };
            }
        }

        /**
         * LO MÁS COMENTADO
         * Lógica: Suma total de comentarios en todas las reseñas de una canción
         * Ejemplo: Si una canción tiene 3 reseñas y entre todas suman 15 comentarios
         */
        async function getMasComentado() {
            try {
                
                return {
                    totalSongs: 0, // Se actualizará con datos reales
                    topSong: {
                        name: 'No hay datos aún',
                        artist: 'Crea reseñas y comenta para ver resultados',
                        totalReviews: 0,
                        totalComments: 0,
                        albumImage: null,
                        artistImage: null
                    }
                };
            } catch (error) {
                console.error('Error obteniendo más comentado:', error);
                return {
                    totalSongs: 0,
                    topSong: {
                        name: 'Error cargando datos',
                        artist: 'Intenta más tarde',
                        totalReviews: 0,
                        totalComments: 0,
                        albumImage: null,
                        artistImage: null
                    }
                };
            }
        }

        /**
         * TOP 10 DE LA SEMANA
         * Lógica: Ranking combinado (calificaciones + comentarios + actividad reciente) de la semana
         */
        async function getTop10Semana() {
            try {
                
                return {
                    period: 'semana',
                    limit: 10,
                    topSong: {
                        name: 'No hay datos aún',
                        artist: 'Crea reseñas esta semana para ver resultados',
                        score: 0,
                        albumImage: null,
                        artistImage: null
                    }
                };
            } catch (error) {
                console.error('Error obteniendo top 10 semana:', error);
                return {
                    period: 'semana',
                    limit: 10,
                    topSong: {
                        name: 'Error cargando datos',
                        artist: 'Intenta más tarde',
                        score: 0,
                        albumImage: null,
                        artistImage: null
                    }
                };
            }
        }

        /**
         * TOP 50 DEL MES
         * Lógica: Ranking combinado (calificaciones + comentarios + actividad reciente) del mes
         */
        async function getTop50Mes() {
            try {
                
                return {
                    period: 'mes',
                    limit: 50,
                    topSong: {
                        name: 'No hay datos aún',
                        artist: 'Crea reseñas este mes para ver resultados',
                        score: 0,
                        albumImage: null,
                        artistImage: null
                    }
                };
            } catch (error) {
                console.error('Error obteniendo top 50 mes:', error);
                return {
                    period: 'mes',
                    limit: 50,
                    topSong: {
                        name: 'Error cargando datos',
                        artist: 'Intenta más tarde',
                        score: 0,
                        albumImage: null,
                        artistImage: null
                    }
                };
            }
        }

        /**
         * TRENDING
         * Lógica: Canciones con mayor crecimiento de actividad en las últimas 24-48 horas
         * Cálculo: Compara actividad (reseñas + comentarios + likes) de últimas 24-48h vs período anterior
         */
        async function getTrending() {
            try {
                
                return {
                    timeWindow: '48 horas',
                    topSong: {
                        name: 'No hay datos aún',
                        artist: 'Crea reseñas para ver tendencias',
                        growthRate: 0,
                        albumImage: null,
                        artistImage: null
                    }
                };
            } catch (error) {
                console.error('Error obteniendo trending:', error);
                return {
                    timeWindow: '48 horas',
                    topSong: {
                        name: 'Error cargando datos',
                        artist: 'Intenta más tarde',
                        growthRate: 0,
                        albumImage: null,
                        artistImage: null
                    }
                };
            }
        }

        // Función para cargar datos dinámicos de cada categoría
        async function loadCarouselData() {
            try {
                const [masRecomendado, masComentado, top10Semana, top50Mes, trending] = await Promise.all([
                    getMasRecomendado(),
                    getMasComentado(),
                    getTop10Semana(),
                    getTop50Mes(),
                    getTrending()
                ]);

                return {
                    'lo-mas-recomendado': masRecomendado,
                    'lo-mas-comentado': masComentado,
                    'top-10-semana': top10Semana,
                    'top-50-mes': top50Mes,
                    'trending': trending
                };
            } catch (error) {
                console.error('Error cargando datos del carrusel:', error);
                return null;
            }
        }

        // Define different "tops" categories con descripciones dinámicas
        let carouselTops = [
            {
                id: 'lo-mas-recomendado',
                title: 'LO MÁS RECOMENDADO',
                description: 'Basado en promedio de estrellas ponderado',
                text: 'Canciones con mejores calificaciones (mínimo 10 reseñas)',
                getDescription: (data) => {
                    if (data && data.topSong) {
                        if (data.topSong.totalReviews > 0) {
                            // Mostrar datos reales cuando estén disponibles
                            const reviewsText = data.topSong.totalReviews === 1 ? 'reseña' : 'reseñas';
                            const avgRating = data.topSong.avgRating ? data.topSong.avgRating.toFixed(1) : '0.0';
                            return `${data.topSong.totalReviews} ${reviewsText} • Promedio ${avgRating} estrellas`;
                        } else {
                            // Si hay 0 reseñas, mostrar mensaje informativo
                            return 'Crea reseñas para ver resultados (mínimo 10 reseñas)';
                        }
                    }
                    // Si no hay datos, mostrar mensaje informativo
                    return 'Basado en promedio de estrellas (mínimo 10 reseñas)';
                }
            },
            {
                id: 'lo-mas-comentado',
                title: 'LO MÁS COMENTADO',
                description: 'Más interacción en comentarios',
                text: 'Canciones con mayor cantidad total de comentarios en sus reseñas',
                getDescription: (data) => {
                    if (data && data.topSong && data.topSong.totalComments > 0) {
                        // Mostrar datos reales cuando estén disponibles
                        return `${data.topSong.totalComments} comentario${data.topSong.totalComments !== 1 ? 's' : ''} en ${data.topSong.totalReviews} reseña${data.topSong.totalReviews !== 1 ? 's' : ''}`;
                    }
                    // Si no hay datos, mostrar mensaje informativo
                    return 'Más interacción en comentarios';
                }
            },
            {
                id: 'top-10-semana',
                title: 'TOP 10 DE LA SEMANA',
                description: 'Ranking semanal combinado',
                text: 'Top 10 basado en calificaciones, comentarios y actividad reciente',
                getDescription: (data) => {
                    if (data && data.topSong) {
                        return `Score: ${data.topSong.score.toFixed(1)} • Período: Esta semana`;
                    }
                    return 'Ranking semanal combinado';
                }
            },
            {
                id: 'top-50-mes',
                title: 'TOP 50 DEL MES',
                description: 'Ranking mensual combinado',
                text: 'Top 50 basado en calificaciones, comentarios y actividad del mes',
                getDescription: (data) => {
                    if (data && data.topSong) {
                        return `Score: ${data.topSong.score.toFixed(1)} • Período: Este mes`;
                    }
                    return 'Ranking mensual combinado';
                }
            },
            {
                id: 'trending',
                title: 'TRENDING',
                description: 'Mayor crecimiento reciente',
                text: 'Canciones con mayor crecimiento de actividad en las últimas 24-48 horas',
                getDescription: (data) => {
                    if (data && data.topSong) {
                        return `+${data.topSong.growthRate}% crecimiento • Últimas ${data.timeWindow}`;
                    }
                    return 'Mayor crecimiento reciente';
                }
            }
        ];

        let currentIndex = 0;
        let carouselData = null;

        /**
         * Función para obtener la URL de la imagen (híbrido: backend o fallback generado)
         * Prioridad: albumImage > artistImage > imagen generada
         */
        function getCarouselImageUrl(categoryId, categoryTitle, data) {
            // Intentar obtener imagen del backend
            if (data && data.topSong) {
                if (data.topSong.albumImage) {
                    return data.topSong.albumImage;
                }
                if (data.topSong.artistImage) {
                    return data.topSong.artistImage;
                }
            }

            // Fallback: Generar imagen con el título de la categoría
            // Usando un servicio de placeholder con gradiente y texto
            const colors = {
                'lo-mas-recomendado': '7C3AED-EC4899', // Púrpura a rosa
                'lo-mas-comentado': '3B82F6-8B5CF6',     // Azul a púrpura
                'top-10-semana': 'EC4899-7C3AED',        // Rosa a púrpura
                'top-50-mes': '8B5CF6-3B82F6',          // Púrpura a azul
                'trending': '7C3AED-3B82F6'              // Púrpura a azul
            };

            const gradient = colors[categoryId] || '7C3AED-EC4899';
            const titleShort = categoryTitle.replace(/\s+/g, '%20');
            
            // Usar placeholder.com con gradiente y texto
            return `https://via.placeholder.com/300x300/${gradient}/ffffff?text=${titleShort}`;
        }

        // Create carousel items
        async function createCarouselItems() {
            carouselWrapper.innerHTML = '';
            indicatorsContainer.innerHTML = '';

            // Cargar datos dinámicos
            carouselData = await loadCarouselData();

            carouselTops.forEach((top, index) => {
                // Obtener datos específicos para esta categoría
                const data = carouselData ? carouselData[top.id] : null;
                const description = top.getDescription ? top.getDescription(data) : top.description;
                
        // Obtener URL de imagen (híbrido: backend o fallback)
        // Intentar obtener imagen real del contenido si está disponible
        let imageUrl = getCarouselImageUrl(top.id, top.title, data);
        
        // Si hay datos del topSong con imagen, usarla
        if (data && data.topSong) {
            const realImage = data.topSong.albumImage || data.topSong.artistImage || data.topSong.image || data.topSong.Image;
            if (realImage && realImage !== '../Assets/default-avatar.png' && realImage !== null) {
                imageUrl = realImage;
            }
        }

        // Create carousel item
        const item = document.createElement('div');
        item.className = `carousel-item ${index === 0 ? 'active' : ''}`;
        item.setAttribute('data-top', top.id);
        item.style.cursor = 'pointer'; // Hacer clickeable
        item.innerHTML = `
            <div class="carousel-card">
                <div class="carousel-album-art">
                    <img src="${imageUrl}" 
                        alt="${top.title}" 
                        class="album-image"
                        onerror="this.onerror=null; this.src='https://via.placeholder.com/300x300/7C3AED/ffffff?text='+encodeURIComponent('${top.title.replace(/'/g, "\\'")}')">
                </div>
                <div class="carousel-content">
                    <h3 class="carousel-title">${top.title}</h3>
                    <p class="carousel-description">${description}</p>
                    <p class="carousel-text">${top.text}</p>
                </div>
            </div>
        `;
        
        // Agregar event listener para hacer clickeable
        item.addEventListener('click', function(e) {
            // No abrir si se hizo clic en los botones de navegación
            if (e.target.closest('.carousel-nav-btn') || e.target.closest('.carousel-indicator')) {
                return;
            }
            showCarouselContentModal(top.id, top.title, top.text, description, data);
        });
        
        carouselWrapper.appendChild(item);
        
        // Intentar obtener imagen real cargando el primer contenido de la categoría
        // Esto se hace de forma asíncrona después de agregar el item al DOM
        (async () => {
            try {
                const firstContent = await loadCarouselContent(top.id, data);
                if (firstContent && firstContent.length > 0) {
                    const firstImage = firstContent[0].image || firstContent[0].albumImage || firstContent[0].artistImage;
                    if (firstImage && firstImage !== '../Assets/default-avatar.png') {
                        // Actualizar la imagen del carrusel si encontramos una real
                        const carouselImage = item.querySelector('.album-image');
                        if (carouselImage) {
                            carouselImage.src = firstImage;
                        }
                    }
                }
            } catch (e) {
                // Silenciar errores, usar imagen por defecto
            }
        })();

                // Create indicator
                const indicator = document.createElement('button');
                indicator.className = `carousel-indicator ${index === 0 ? 'active' : ''}`;
                indicator.setAttribute('data-index', index);
                indicator.addEventListener('click', () => {
                    goToSlide(index);
                    resetAutoPlay();
                });
                indicatorsContainer.appendChild(indicator);
            });
        }

        function goToSlide(index) {
            const items = carouselWrapper.querySelectorAll('.carousel-item');
            const indicators = indicatorsContainer.querySelectorAll('.carousel-indicator');

            if (index < 0) index = items.length - 1;
            if (index >= items.length) index = 0;

            items.forEach((item, i) => {
                item.classList.toggle('active', i === index);
            });

            indicators.forEach((indicator, i) => {
                indicator.classList.toggle('active', i === index);
            });

            currentIndex = index;
        }

        function nextSlide() {
            goToSlide(currentIndex + 1);
        }

        function prevSlide() {
            goToSlide(currentIndex - 1);
        }

        // Auto-play functionality
        let autoPlayInterval = null;
        const autoPlayDelay = 3000; // 3 seconds

        function startAutoPlay() {
            if (autoPlayInterval) clearInterval(autoPlayInterval);
            autoPlayInterval = setInterval(() => {
                nextSlide();
            }, autoPlayDelay);
        }

        function stopAutoPlay() {
            if (autoPlayInterval) {
                clearInterval(autoPlayInterval);
                autoPlayInterval = null;
            }
        }

        function resetAutoPlay() {
            stopAutoPlay();
            startAutoPlay();
        }

        // Event listeners
        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetAutoPlay();
        });
        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetAutoPlay();
        });

        // Pause auto-play on hover
        carouselWrapper.addEventListener('mouseenter', stopAutoPlay);
        carouselWrapper.addEventListener('mouseleave', startAutoPlay);

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                prevSlide();
                resetAutoPlay();
            }
            if (e.key === 'ArrowRight') {
                nextSlide();
                resetAutoPlay();
            }
        });

        // Exponer función para recargar el carrusel desde fuera
        window.reloadCarousel = async function() {
            console.log('🔄 Recargando carrusel...');
            try {
                await createCarouselItems();
                // Mantener el índice actual si es posible
                goToSlide(0);
                startAutoPlay();
                console.log('✅ Carrusel recargado exitosamente');
            } catch (error) {
                console.error('❌ Error recargando carrusel:', error);
            }
        };

        // Initialize carousel (async)
        createCarouselItems().then(() => {
            // Start auto-play after carousel is loaded
            startAutoPlay();
        }).catch(error => {
            console.error('Error inicializando carrusel:', error);
            // Start auto-play anyway
            startAutoPlay();
        });
    }


// (Pega aquí las funciones del carrusel)


// --- 6. LÓGICA DEL FEED DE RESEÑAS ---

function initializeReviews() {
    const reviewsList = document.getElementById('reviewsList');

    const sampleReviews = [
            {
                username: 'DeniDen',
                song: 'Love Story',
                artist: 'Taylor Swift',
                comment: 'Buena cancion',
                rating: 3,
                likes: 45,
                comments: 12
            },
            {
                username: 'Luli',
                song: 'Niño',
                artist: 'Milo J',
                comment: 'Canción nostalgica',
                rating: 5,
                likes: 89,
                comments: 23
            },
            {
                username: 'Miri ✨',
                song: 'Ya no vuelvas',
                artist: 'Luck Ra',
                comment: 'Se lucio Luck Ra',
                rating: 4,
                likes: 67,
                comments: 18
            }
        ];

    // Esta es la función renderReviews completa para tu new homeAdmin.js

function renderReviews(reviews) {
    const currentUserId = localStorage.getItem('userId');
    const isLoggedIn = currentUserId !== null;
    
    // --- LÍNEA AÑADIDA ---
    // Obtenemos la lista del DOM (ya no es global)
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return; // Salir si no estamos en la página de inicio

    reviewsList.innerHTML = reviews.map((review, index) => {
            // Asegurar que siempre tengamos un ID válido
            let reviewId = review.id || review.ReviewId || review.reviewId;
            
            // Normalizar el reviewId (convertir a string y limpiar)
            if (reviewId) {
                reviewId = String(reviewId).trim();
                  // Si después de normalizar está vacío o es "null" o "undefined", rechazar
                if (!reviewId || reviewId === 'null' || reviewId === 'undefined') {
                        console.warn('⚠️ Reseña con ID inválido en renderReviews, omitiendo:', { review, reviewId });
                        return '';
                }
            } else {
                console.warn('⚠️ Reseña sin ID en renderReviews, omitiendo:', review);
                return '';
            }
            
            const isLiked = review.userLiked || false;
            const likeCount = review.likes || 0;
            const commentCount = review.comments || 0;
            const defaultAvatar = '../Assets/default-avatar.png';
            
            // Verificar si es la reseña del usuario actual
            const reviewUserId = review.userId || review.UserId || '';
            const isOwnReview = currentUserId && (reviewUserId === currentUserId || reviewUserId.toString() === currentUserId.toString());
            
            return `
            <div class="review-item" data-review-id="${reviewId}">
                <div class="review-user review-clickable" data-review-id="${reviewId}" style="cursor: pointer;">
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
                            ${isLoggedIn && isOwnReview ? `
                            <button class="review-btn btn-edit"  
                                    data-review-id="${reviewId}"
                                        data-review-title="${review.title || ''}"
                                        data-review-content="${review.comment || ''}"
                                        data-review-rating="${review.rating || 0}"
                                        title="Editar reseña">
                                    <i class="fas fa-pencil"></i>
                            </button>
                            <button class="review-btn btn-delete"  
                                        data-review-id="${reviewId}"
                                        title="Eliminar reseña">
                                    <i class="fas fa-trash"></i>
                            </button>
                            ` : isLoggedIn ? `
                            <button class="review-btn btn-report"  
                                        data-review-id="${reviewId}"
                                        title="Reportar reseña">
                                    <i class="fas fa-flag"></i>
                            </button>
                            ` : ''}
                            <div class="review-likes-container">
                                    <span class="review-likes-count">${likeCount}</span>
                                    <button class="review-btn btn-like ${isLiked ? 'liked' : ''}"  
                                                data-review-id="${reviewId}"
                                                title="${!isLoggedIn ? 'Inicia sesión para dar Me Gusta' : ''}">
                                                <i class="fas fa-heart" style="color: ${isLiked ? 'var(--magenta, #EC4899)' : 'rgba(255,255,255,0.7)'};"></i>
                                    </button>
                            </div>
                            <button class="review-btn comment-btn"  
                                        data-review-id="${reviewId}"
                                        title="Ver comentarios">
                                    <i class="fas fa-comment"></i>
                                    <span class="review-comments-count">${commentCount}</span>
                            </button>
                        </div>
                </div>
            </div>
            `;
    }).join('');

    // --- LÍNEA AÑADIDA ---
    // Después de crear el HTML, llamamos a la función que agrega los listeners
    attachReviewActionListeners(reviewsList);
}


    function initializeReviewFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
            filterButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const filter = btn.dataset.filter;
                    setReviewFilter(filter);
                });
            });
    }
    
    async function loadReviewsFunction() {
            const currentUserId = localStorage.getItem('userId') ? localStorage.getItem('userId') : null;
            
            try {
                // 1. Obtener todas las reseñas a través del gateway (con timeout de 5 segundos)
                let reviews = [];
                try {
                    const reviewsResponse = await axios.get(`${ API_BASE_URL}/api/gateway/reviews`, {
                        timeout: 5000
                    });
                    reviews = reviewsResponse.data || [];
                } catch (error) {
                    // Si hay un error 502 (Bad Gateway) o de conexión, mostrar mensaje pero no fallar completamente
                    if (error.response?.status === 502 || error.code === 'ECONNABORTED' || error.message?.includes('Network Error')) {
                        console.warn('⚠️ No se pudo conectar con el servicio de reseñas. El servicio puede estar iniciando...');
                        // Renderizar lista vacía en lugar de mostrar error crítico
                        renderReviews([]);
                        return;
                    }
                    // Para otros errores, lanzar la excepción
                    throw error;
                }
                
                if (!reviews || reviews.length === 0) {
                    renderReviews([]);
                    return;
                }
                
                // 2. Para cada reseña, obtener detalles completos (usuario, likes, comentarios)
                const reviewsWithDetails = await Promise.all(
                    reviews.map(async (review) => {
                        try {
                            // Validar que ReviewId existe (puede venir como ReviewId, reviewId, o id)
                            // También verificar variantes con guiones bajos (Id_Review, id_review)
                            let reviewId = review.ReviewId || review.reviewId || review.id || 
                                        review.Id_Review || review.id_Review || review.Id_Review;
                            
                            if (!reviewId) {
                                console.warn('⚠️ Reseña sin ID válido, omitiendo:', review);
                                return null;
                            }
                            
                            // Normalizar el reviewId (convertir a string y trim)
                            reviewId = String(reviewId).trim();
                            
                            // Validar que después de normalizar no esté vacío o sea "null"/"undefined"
                            if (!reviewId || reviewId === 'null' || reviewId === 'undefined' || reviewId === '00000000-0000-0000-0000-000000000000') {
                                console.warn('⚠️ Reseña con ID inválido después de normalizar, omitiendo:', { review, reviewId });
                                return null;
                            }
                            
                            // Intentar obtener detalles completos usando el endpoint agregador
                            let reviewDetails = null;
                            // Validar que UserId existe antes de hacer toString()
                            const userIdStr = review.UserId ? (review.UserId.toString ? review.UserId.toString() : String(review.UserId)) : 'unknown';
                            let username = `Usuario ${userIdStr.substring(0, 8)}`;
                            let avatar = '../Assets/default-avatar.png';
                            
                            try {
                                const detailsResponse = await axios.get(
                                    `${ API_BASE_URL}/api/review-details/${reviewId}`,
                                    { timeout: 3000 }
                                );
                                reviewDetails = detailsResponse.data;
                                if (reviewDetails?.user) {
                                    username = reviewDetails.user.username || reviewDetails.user.Username || username;
                                    avatar = reviewDetails.user.imgProfile || reviewDetails.user.imgProfile || avatar;
                                }
                            } catch (error) {
                                // Silenciar errores 404, 500 y 502 del endpoint agregador (son esperados cuando el servicio no está disponible)
                                const status = error.response?.status;
                                if (status !== 404 && status !== 500 && status !== 502) {
                                    console.debug(`No se pudieron obtener detalles completos para review ${reviewId}, intentando obtener usuario directamente`);
                                }
                                
                                // Intentar obtener el usuario directamente del User Service
                                if (review.UserId || review.userId) {
                                    try {
                                        const userId = review.UserId || review.userId;
                                        const userResponse = await axios.get(
                                            `${ API_BASE_URL}/api/gateway/users/${userId}`,
                                            { timeout: 2000 }
                                        );
                                        if (userResponse.data) {
                                            username = userResponse.data.Username || userResponse.data.username || username;
                                            avatar = userResponse.data.imgProfile || userResponse.data.ImgProfile || avatar;
                                        }
                                    } catch (userError) {
                                        // Silenciar errores de usuario también
                                        if (userError.response?.status !== 404 && userError.response?.status !== 500 && userError.response?.status !== 502) {
                                            console.debug(`No se pudo obtener usuario ${review.UserId || review.userId} del User Service`);
                                        }
                                    }
                                }
                            }
                            
                            // Obtener cantidad de likes (reacciones) a través del gateway
                            let likes = 0;
                            try {
                                const likesResponse = await axios.get(
                                    `${ API_BASE_URL}/api/gateway/reviews/${reviewId}/reactions/count`,
                                    { timeout: 3000 }
                                );
                                likes = likesResponse.data || 0;
                            } catch (error) {
                                // Si no hay ruta en gateway, intentar directo (fallback)
                                try {
                                    const likesResponse = await axios.get(
                                        `http://localhost:8002/Reaction/${reviewId}/Reviews/count`,
                                        { timeout: 3000 }
                                    );
                                    likes = likesResponse.data || 0;
                                } catch (e) {
                                    // Silenciar el error si el reviewId es válido pero no hay likes
                                    if (reviewId && reviewId !== 'undefined') {
                                        console.debug(`No se pudieron obtener likes para review ${reviewId}`);
                                    }
                                    likes = 0;
                                }
                            }
                            
                            // Obtener cantidad de comentarios
                            let comments = 0;
                            const authToken = localStorage.getItem('authToken');
                            
                            // Si es modo desarrollo, usar comentarios simulados
                            if (authToken && authToken.startsWith('dev-token-')) {
                                comments = commentsData[reviewId] ? commentsData[reviewId].length : 0;
                            } else {
                                // Modo real: obtener del backend a través del gateway
                                try {
                                    const commentsResponse = await axios.get(
                                        `${ API_BASE_URL}/api/gateway/reviews/${reviewId}/comments`,
                                        { timeout: 3000 }
                                    );
                                    comments = Array.isArray(commentsResponse.data) ? commentsResponse.data.length : 0;
                                } catch (error) {
                                    // Si no hay ruta en gateway, intentar directo (fallback)
                                    try {
                                        const commentsResponse = await axios.get(
                                            `${ API_BASE_URL}/api/gateway/comments/review/${reviewId}`,
                                            { timeout: 3000 }
                                        );
                                        comments = Array.isArray(commentsResponse.data) ? commentsResponse.data.length : 0;
                                    } catch (e) {
                                        // Silenciar el error si el reviewId es válido pero no hay comentarios
                                        if (reviewId && reviewId !== 'undefined') {
                                            console.debug(`No se pudieron obtener comentarios para review ${reviewId}`);
                                        }
                                        comments = 0;
                                    }
                                }
                            }
                            
                            // Verificar si el usuario actual dio like
                            let userLiked = false;
                            if (currentUserId) {
                                // Verificar si hay un reactionId guardado en localStorage (del backend)
                                const storedReactionId = localStorage.getItem(`reaction_${reviewId}_${currentUserId}`);
                                // También verificar el estado local (fallback si el backend falló)
                                const localLike = localStorage.getItem(`like_${reviewId}_${currentUserId}`);
                                userLiked = storedReactionId !== null || localLike === 'true';
                            }
                            
                            // Intentar obtener nombres reales de canción/álbum desde el Content Service
                            let songName = review.SongId ? 'Canción' : 'Álbum';
                            let albumName = 'Álbum';
                            let artistName = 'Artista';
                            
                            // PRIMERO: Intentar obtener desde localStorage (SIEMPRE tiene prioridad si existe)
                            let contentData = null;
                            if (reviewId) {
                                const normalizedReviewId = String(reviewId).trim();
                                const storageKey = `review_content_${normalizedReviewId}`;
                                const storedContentData = localStorage.getItem(storageKey);
                                
                                if (storedContentData) {
                                    try {
                                        contentData = JSON.parse(storedContentData);
                                        console.log(`📦 [DEBUG] Datos encontrados en localStorage para review ${reviewId}:`, contentData);
                                        
                                        // Si tenemos datos válidos en localStorage, USARLOS DIRECTAMENTE
                                        if (contentData && contentData.name && contentData.name !== 'Canción' && contentData.name !== 'Álbum' && contentData.name.trim() !== '') {
                                            // Usar los datos guardados directamente
                                            if (contentData.type === 'song') {
                                                songName = contentData.name;
                                                artistName = contentData.artist || artistName;
                                                console.log(`✅ [DEBUG] Usando datos de localStorage para canción:`, { songName, artistName });
                                            } else if (contentData.type === 'album') {
                                                albumName = contentData.name;
                                                artistName = contentData.artist || artistName;
                                                console.log(`✅ [DEBUG] Usando datos de localStorage para álbum:`, { albumName, artistName });
                                            }
                                            // Marcar que ya tenemos los datos, no necesitamos buscar más
                                            // IMPORTANTE: Mantener contentData con todos sus datos para usarlo después
                                            contentData._used = true;
                                        }
                                    } catch (e) {
                                        console.error('❌ Error parseando datos de contenido guardados:', e);
                                    }
                                } else {
                                    console.log(`⚠️ [DEBUG] No se encontraron datos en localStorage para review ${reviewId}`);
                                }
                                }
                                
                            // SEGUNDO: Si no hay datos válidos en localStorage, intentar obtener directamente desde Content Service usando los IDs de la reseña
                            if (!contentData || !contentData._used) {
                                // Intentar obtener desde Content Service usando SongId o AlbumId de la reseña
                                if (review.SongId) {
                                    try {
                                        const songIdStr = String(review.SongId).trim();
                                        console.log(`🔍 [DEBUG] Obteniendo datos de canción desde Content Service con ID: ${songIdStr}`);
                                        console.log(`🔍 [DEBUG] review.SongId original:`, review.SongId);
                                                const songResponse = await axios.get(
                                            `${ API_BASE_URL}/api/gateway/contents/song/${songIdStr}`,
                                                    { timeout: 3000 }
                                                );
                                        console.log(`🔍 [DEBUG] Respuesta del Content Service:`, songResponse.data);
                                                if (songResponse.data) {
                                            const newSongName = songResponse.data.Title || songResponse.data.title || songResponse.data.Name || songResponse.data.name;
                                            const newArtistName = songResponse.data.ArtistName || songResponse.data.artistName || songResponse.data.Artist || songResponse.data.artist;
                                            
                                            if (newSongName && newSongName !== 'Canción') {
                                                songName = newSongName;
                                            }
                                            if (newArtistName && newArtistName !== 'Artista') {
                                                artistName = newArtistName;
                                            }
                                            
                                            console.log(`✅ [DEBUG] Datos obtenidos desde Content Service para canción:`, { 
                                                songName, 
                                                artistName,
                                                originalData: songResponse.data 
                                            });
                                            
                                            // Guardar en localStorage para próximas veces
                                            if (reviewId) {
                                                const normalizedReviewId = String(reviewId).trim();
                                                const storageKey = `review_content_${normalizedReviewId}`;
                                                const contentDataToStore = {
                                                    type: 'song',
                                                    name: songName,
                                                    artist: artistName,
                                                    id: songIdStr,
                                                    image: songResponse.data.Image || songResponse.data.image || '../Assets/default-avatar.png'
                                                };
                                                localStorage.setItem(storageKey, JSON.stringify(contentDataToStore));
                                                console.log(`💾 [DEBUG] Datos guardados en localStorage:`, contentDataToStore);
                                            }
                                        }
                                    } catch (e) {
                                        console.error(`❌ [DEBUG] Error obteniendo canción desde Content Service:`, e);
                                        console.error(`❌ [DEBUG] URL intentada: ${ API_BASE_URL}/api/gateway/contents/song/${String(review.SongId).trim()}`);
                                        console.debug(`⚠️ No se pudo obtener canción desde Content Service:`, e.message);
                                    }
                                } else if (review.AlbumId) {
                                    try {
                                        const albumIdStr = String(review.AlbumId).trim();
                                        console.debug(`🔍 Obteniendo datos de álbum desde Content Service con ID: ${albumIdStr}`);
                                            const albumResponse = await axios.get(
                                            `${ API_BASE_URL}/api/gateway/contents/album/${albumIdStr}`,
                                                { timeout: 3000 }
                                            );
                                            if (albumResponse.data) {
                                                albumName = albumResponse.data.Title || albumResponse.data.title || albumName;
                                            
                                            // Para álbumes, intentar obtener el artista desde la primera canción del álbum
                                            if (albumResponse.data.Songs && albumResponse.data.Songs.length > 0) {
                                                const firstSong = albumResponse.data.Songs[0];
                                                const foundArtist = firstSong.ArtistName || firstSong.artistName || firstSong.Artist || firstSong.artist;
                                                if (foundArtist && foundArtist !== 'Artista') {
                                                    artistName = foundArtist;
                                                    console.debug(`✅ Artista obtenido desde primera canción del álbum:`, artistName);
                                            }
                                            }
                                            
                                            // Si aún no tenemos artista, intentar desde ArtistName del álbum (si existe)
                                            if (artistName === 'Artista' && albumResponse.data.ArtistName) {
                                                artistName = albumResponse.data.ArtistName;
                                            }
                                            
                                            console.debug(`✅ Datos obtenidos desde Content Service para álbum:`, { albumName, artistName });
                                            
                                            // Guardar en localStorage para próximas veces (SIEMPRE guardar, incluso si el artista es 'Artista')
                                            if (reviewId) {
                                                const normalizedReviewId = String(reviewId).trim();
                                                const storageKey = `review_content_${normalizedReviewId}`;
                                                const contentDataToStore = {
                                                    type: 'album',
                                                    name: albumName,
                                                    artist: artistName, // Guardar el artista obtenido (o 'Artista' si no se encontró)
                                                    id: albumIdStr,
                                                    image: albumResponse.data.Image || albumResponse.data.image || '../Assets/default-avatar.png'
                                                };
                                                localStorage.setItem(storageKey, JSON.stringify(contentDataToStore));
                                                console.debug(`💾 Datos guardados en localStorage:`, contentDataToStore);
                                            }
                                        }
                                    } catch (e) {
                                        console.debug(`⚠️ No se pudo obtener álbum desde Content Service:`, e.message);
                                    }
                                }
                            }
                            
                            // TERCERO: Intentar obtener desde reviewDetails si aún no tenemos datos (fallback final)
                            if ((songName === 'Canción' || albumName === 'Álbum' || artistName === 'Artista') && reviewDetails) {
                                if (reviewDetails.song) {
                                    songName = reviewDetails.song.Title || reviewDetails.song.title || songName;
                                    artistName = reviewDetails.song.ArtistName || reviewDetails.song.artistName || artistName;
                                } else if (reviewDetails.album) {
                                    albumName = reviewDetails.album.Title || reviewDetails.album.title || albumName;
                                    artistName = reviewDetails.album.ArtistName || reviewDetails.album.artistName || artistName;
                                }
                            }
                            
                            // Mapear datos del backend al formato del frontend
                            // Intentar obtener la fecha de creación (puede venir como CreatedAt, Created, Date, etc.)
                            const createdAt = review.CreatedAt || review.Created || review.Date || review.Timestamp || new Date();
                            const createdAtDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
                            
                            // Determinar el tipo de contenido y el nombre a mostrar
                            // PRIORIDAD: Usar el tipo de contentData si está disponible, sino usar review.SongId/AlbumId
                            let contentType;
                            let contentName;
                            
                            if (contentData && contentData.type) {
                                // Usar el tipo de localStorage (más confiable)
                                contentType = contentData.type;
                                contentName = contentData.type === 'song' ? songName : albumName;
                                console.log(`✅ [DEBUG] Usando contentType desde localStorage: ${contentType}, contentName: ${contentName}`);
                            } else {
                                // Fallback: usar review.SongId/AlbumId
                                contentType = review.SongId ? 'song' : 'album';
                                contentName = review.SongId ? songName : albumName;
                                console.log(`⚠️ [DEBUG] Usando contentType desde review (fallback): ${contentType}, contentName: ${contentName}`);
                            }
                            
                            // DEBUG: Log final antes de retornar
                            console.log(`🔍 [DEBUG] Datos finales para review ${reviewId}:`, {
                                contentType,
                                contentName,
                                songName,
                                albumName,
                                artistName,
                                hasContentData: !!contentData,
                                contentDataFromStorage: contentData
                            });
                            
                            return {
                                id: reviewId,
                                username: username,
                                song: contentName, // Nombre de la canción o álbum
                                artist: artistName,
                                contentType: contentType, // 'song' o 'album'
                                title: review.Title || review.title || '', // Título de la reseña
                                comment: review.Content || review.content || 'Sin contenido', // Contenido/descripción de la reseña
                                rating: review.Rating || review.rating || 0,
                                likes: likes,
                                comments: comments,
                                userLiked: userLiked,
                                avatar: avatar,
                                userId: review.UserId || review.userId,
                                songId: review.SongId || review.songId,
                                albumId: review.AlbumId || review.albumId,
                                createdAt: createdAtDate
                            };
                        } catch (error) {
                            // Validar que ReviewId existe
                            const reviewId = review.ReviewId || review.reviewId || review.id;
                            if (!reviewId) {
                                console.warn('⚠️ Reseña sin ID válido en catch, omitiendo:', review);
                                return null;
                            }
                            
                            console.error(`Error obteniendo detalles de review ${reviewId}:`, error);
                            // Retornar review con datos básicos si falla obtener detalles
                            // Intentar obtener la fecha de creación
                            const createdAt = review.CreatedAt || review.Created || review.Date || review.Timestamp || new Date();
                            const createdAtDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
                            
                            // Validar que UserId existe antes de hacer toString()
                            const userIdStr = review.UserId ? (review.UserId.toString ? review.UserId.toString() : String(review.UserId)) : 'unknown';
                            
                            return {
                                id: reviewId,
                                username: `Usuario ${userIdStr.substring(0, 8)}`,
                                song: review.SongId ? 'Canción' : 'Álbum',
                                artist: 'Artista',
                                contentType: review.SongId ? 'song' : 'album',
                                title: review.Title || review.title || '', // Título de la reseña
                                comment: review.Content || review.content || 'Sin contenido', // Contenido/descripción de la reseña
                                rating: review.Rating || review.rating || 0,
                                likes: 0,
                                comments: 0,
                                userLiked: false,
                                avatar: '../Assets/default-avatar.png',
                                userId: review.UserId || review.userId,
                                createdAt: createdAtDate
                            };
                        }
                    })
                );
                
                // Filtrar reseñas nulas (que no tienen ID válido)
                const validReviews = reviewsWithDetails.filter(review => review !== null);
                
                if (validReviews.length === 0) {
                    showAlert('No hay reseñas válidas disponibles', 'info');
                    renderReviews([]);
                    return;
                }
                
                // 3. Ordenar según el filtro seleccionado
                let sortedReviews;
                if (currentReviewFilter === 'recent') {
                    // Ordenar por fecha de creación (más recientes primero)
                    sortedReviews = validReviews.sort((a, b) => {
                        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
                        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
                        return dateB - dateA; // Más recientes primero
                    });
                } else {
                    // Ordenar por likes (más populares primero)
                    sortedReviews = validReviews.sort((a, b) => b.likes - a.likes);
                }
                
                // 4. Renderizar reseñas
                renderReviews(sortedReviews);
                
            } catch (error) {
                console.error('Error cargando reseñas:', error);
                
                // Si ya manejamos el error 502 arriba, no mostrar otro mensaje
                if (error.response?.status === 502 || error.code === 'ECONNABORTED') {
                    // Ya se manejó arriba, solo renderizar lista vacía
                    renderReviews([]);
                    return;
                }
                
                if (error.response) {
                    // Error del servidor
                    const status = error.response.status;
                    console.warn(`Error del servidor: ${status}`);
                    
                    if (status === 404) {
                        // No hay reseñas, renderizar lista vacía
                        renderReviews([]);
                    } else {
                        // Para otros errores, usar datos de ejemplo como fallback silencioso
                        const sortedReviews = [...sampleReviews].sort((a, b) => b.likes - a.likes);
                        renderReviews(sortedReviews);
                    }
                } else if (error.request) {
                    // No se pudo conectar al servidor - usar datos de ejemplo sin mostrar alerta molesta
                    console.warn('No se pudo conectar al servidor. Usando datos de ejemplo.');
                    const sortedReviews = [...sampleReviews].sort((a, b) => b.likes - a.likes);
                    renderReviews(sortedReviews);
                } else {
                    console.error('Error inesperado al cargar reseñas:', error);
                    // Usar datos de ejemplo como fallback
                    const sortedReviews = [...sampleReviews].sort((a, b) => b.likes - a.likes);
                    renderReviews(sortedReviews);
                }
            }
        }

    // --- Inicialización ---
    loadReviews = loadReviewsFunction;
    loadReviews();
    initializeReviewFilters();
}

/**
 * Agrega listeners a los botones de la tarjeta de reseña (like, comment, edit, delete).
 * Esta función es llamada por renderReviews().
 */
function attachReviewActionListeners(reviewsListElement) { 
    reviewsListElement.querySelectorAll('.btn-like').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                showLoginRequiredModal(); // Esta función debe estar en este archivo o importada
                return;
            }
            
            const icon = this.querySelector('i');
            const likesSpan = this.parentElement.querySelector('.review-likes-count');
            const isLiked = this.classList.contains('liked');
            const reviewId = this.getAttribute('data-review-id');

            this.style.transform = 'scale(1.2)';
            setTimeout(() => { this.style.transform = ''; }, 200);

            if (isLiked) {
                // --- INICIO DEL CAMBIO ---
                // Quitar like (Optimistic Update)
                this.classList.remove('liked');
                icon.style.color = 'rgba(255,255,255,0.7)';
                const currentLikes = parseInt(likesSpan.textContent);
                likesSpan.textContent = Math.max(0, currentLikes - 1);
                
                // Llama a la API importada
                const userId = localStorage.getItem('userId');
                const reactionId = localStorage.getItem(`reaction_${reviewId}_${userId}`); // Obtener reactionId
                deleteReviewReaction(reviewId, userId, authToken, reactionId)
                    .then(() => localStorage.removeItem(`like_${reviewId}_${userId}`)) // Limpia el fallback
                    .catch(err => {
                        console.warn('No se pudo eliminar like del backend', err);
                    });
                // --- FIN DEL CAMBIO ---
            } else {
                // --- INICIO DEL CAMBIO ---
                // Agregar like (Optimistic Update)
                this.classList.add('liked');
                icon.style.color = 'var(--magenta, #EC4899)';
                const currentLikes = parseInt(likesSpan.textContent) || 0;
                likesSpan.textContent = currentLikes + 1;
                
                const currentUserId = localStorage.getItem('userId');
                localStorage.setItem(`like_${reviewId}_${currentUserId}`, 'true'); // Fallback
                
                // Llama a la API importada
                addReviewReaction(reviewId, currentUserId, authToken)
                    .then(data => {
                        // Guarda el ID real de la reacción para poder borrarlo después
                        const reactionId = data?.Id_Reaction || data?.ReactionId || data?.id;
                        if (reactionId) {
                            localStorage.setItem(`reaction_${reviewId}_${currentUserId}`, reactionId);
                        }
                    })
                    .catch(err => {
                        console.warn('No se pudo guardar like en el backend', err);
                    });
                // --- FIN DEL CAMBIO ---
            }
        });
    });

    // Add event listeners for edit buttons
    reviewsListElement.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const reviewId = this.getAttribute('data-review-id');
            const title = this.getAttribute('data-review-title') || '';
            const content = this.getAttribute('data-review-content') || '';
            const rating = parseInt(this.getAttribute('data-review-rating')) || 0;
            
            showEditReviewModal(reviewId, title, content, rating); // Esta función debe estar en homeAdmin.js
        });
    });
    
    // Add event listeners for delete buttons
    reviewsListElement.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); 
            let reviewId = this.getAttribute('data-review-id');
            // ... (el resto de tu lógica para encontrar el reviewId y el title)
            const reviewTitle = this.closest('.review-item')?.querySelector('.review-title')?.textContent || 'esta reseña';
            
            showDeleteReviewModal(reviewId, reviewTitle); // Esta función debe estar en homeAdmin.js
        });
    });
    
    // Botones de reportar reseñas
    reviewsListElement.querySelectorAll('.btn-report').forEach(btn => {
        btn.addEventListener('click', function() {
            const reviewId = this.getAttribute('data-review-id');
            reportReview(reviewId); // Esta función debe estar en homeAdmin.js
        });
    });
    
    // Add event listeners for comment buttons
    reviewsListElement.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); 
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                showLoginRequiredModal(); // Esta función debe estar importada o en homeAdmin.js
                return;
            }
            
            const reviewId = this.getAttribute('data-review-id');
            showCommentsModal(reviewId); // Esta función debe estar en homeAdmin.js
        });
    });
    
    // Hacer las reseñas clickeables para abrir vista detallada
    reviewsListElement.querySelectorAll('.review-clickable').forEach(element => {
        element.addEventListener('click', function(e) {
            // No abrir si se hizo clic en un botón de acción
            if (e.target.closest('.review-actions') || e.target.closest('.btn-edit') || e.target.closest('.btn-delete') || e.target.closest('.btn-report') || e.target.closest('.btn-like') || e.target.closest('.comment-btn')) {
                return;
            }
            
            const reviewId = this.getAttribute('data-review-id');
            if (reviewId) {
                showReviewDetailModal(reviewId); // Esta función debe estar en homeAdmin.js
            }
        });
    });
}


// --- 7. LÓGICA DE MODALS (Crear, Editar, Comentarios, Detalle, Borrar, Reportar) ---



/**
 * Inicializa todos los listeners para el modal de crear/editar reseña.
 */
function initializeCreateReviewModal() {
    const addReviewBtn = document.getElementById('addReviewBtn');
    const closeCreateReviewModal = document.getElementById('closeCreateReviewModal');
    const createReviewModalOverlay = document.getElementById('createReviewModalOverlay');
    const submitCreateReviewBtn = document.getElementById('submitCreateReviewBtn');
    const createReviewStars = document.getElementById('createReviewStars');
    const contentSearchInput = document.getElementById('contentSearchInput');
    const contentSearchDropdown = document.getElementById('contentSearchDropdown');
    const changeContentBtn = document.getElementById('changeContentBtn');
    
    if (addReviewBtn) {
        addReviewBtn.addEventListener('click', () => showCreateReviewModal());
    }
    if (closeCreateReviewModal) {
        closeCreateReviewModal.addEventListener('click', hideCreateReviewModal);
    }
    if (createReviewModalOverlay) {
        createReviewModalOverlay.addEventListener('click', (e) => {
            if (e.target === createReviewModalOverlay) hideCreateReviewModal();
        });
    }
    
    if (submitCreateReviewBtn) {
        submitCreateReviewBtn.addEventListener('click', (e) => {
            console.log('🔘 Botón de crear reseña clickeado');
            e.preventDefault();
            submitCreateReview();
        });
    }
    
    if (changeContentBtn) {
        changeContentBtn.addEventListener('click', () => {
            // Volver al selector de búsqueda
            document.getElementById('createReviewContentSelector').style.display = 'block';
            document.getElementById('createReviewContentInfo').style.display = 'none';
            if (contentSearchInput) {
                contentSearchInput.value = '';
                contentSearchInput.focus();
            }
            currentReviewData = null;
        });
    }
    
    // Inicializar búsqueda de contenido dentro del modal
    if (contentSearchInput) {
        let searchTimeout;
        let currentSearchController = null;
        
        contentSearchInput.addEventListener('input', function() {
            if (currentSearchController) {
                currentSearchController.abort();
            }
            clearTimeout(searchTimeout);
            
            if (this.value.length > 0) {
                currentSearchController = new AbortController();
                searchTimeout = setTimeout(() => {
                    performContentSearch(this.value.trim(), currentSearchController.signal);
                }, 500);
            } else {
                if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
            }
        });
        
        document.addEventListener('click', (e) => {
            if (contentSearchInput && contentSearchDropdown && !contentSearchInput.contains(e.target) && !contentSearchDropdown.contains(e.target)) {
                if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
            }
        });
    }
    
    // Inicializar estrellas del modal
    if (createReviewStars) {
        const stars = createReviewStars.querySelectorAll('.star-input');
        let currentRating = 0;

        function highlightStars(rating) {
            stars.forEach((star, index) => {
                star.classList.toggle('active', (index + 1) <= rating);
            });
        }
        
        function updateStarRating(rating) {
            currentRating = rating;
            highlightStars(rating);
        }
            
        stars.forEach((star) => {
            star.addEventListener('click', function() {
                updateStarRating(parseInt(this.getAttribute('data-rating')));
            });
            star.addEventListener('mouseenter', function() {
                highlightStars(parseInt(this.getAttribute('data-rating')));
            });
        });
        
        createReviewStars.addEventListener('mouseleave', () => highlightStars(currentRating));
    }
}

/**
 * REFACTORIZADA: Busca contenido usando la API de búsqueda
 */
async function performContentSearch(query, signal) {
    const contentSearchDropdown = document.getElementById('contentSearchDropdown');
    if (!query || query.length === 0) {
        if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
        return;
    }
    
    if (contentSearchDropdown) {
        contentSearchDropdown.innerHTML = '<div class="search-loading">Buscando...</div>';
        contentSearchDropdown.style.display = 'block';
    }
    
    try {
        // ¡LLAMADA A API REFACTORIZADA!
        const results = await fetchSearchResults(query, signal);
        if(results === null) return; // Búsqueda cancelada
        displayContentSearchResults(results, query);
    } catch (error) {
        console.error('Error en la búsqueda del modal:', error);
        if (contentSearchDropdown) {
            contentSearchDropdown.innerHTML = `
                <div class="search-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Error al buscar. Intenta nuevamente.</span>
                </div>
            `;
            contentSearchDropdown.style.display = 'block';
        }
    }
}
            
/**
 * REFACTORIZADA: Muestra los resultados de búsqueda en el dropdown del modal
 */
function displayContentSearchResults(results, query) {
    const contentSearchDropdown = document.getElementById('contentSearchDropdown');
    
    const albums = results.Albums || results.albums || [];
    const songs = results.Songs || results.songs || [];
    
    if (albums.length === 0 && songs.length === 0) {
        if (contentSearchDropdown) {
            contentSearchDropdown.innerHTML = `
                <div class="search-no-results">
                    <i class="fas fa-search"></i>
                    <span>No se encontraron resultados para "${query}"</span>
                </div>
            `;
            contentSearchDropdown.style.display = 'block';
        }
        return;
    }
    
    let html = '';
    
    // Canciones primero (como en Spotify)
    if (songs.length > 0) {
        songs.forEach(song => {
            const songId = song.apiSongId || song.APISongId || song.APIId || song.apiId || song.Id || song.id || song.SongId || song.songId || '';
            const songTitle = song.Title || song.title || song.Name || song.name || '';
            const songImage = song.Image || song.image || song.AlbumImage || song.albumImage || '../Assets/default-avatar.png';
            const artistName = song.ArtistName || song.artistName || song.Artist || song.artist || '';
            const subtitle = artistName ? `Canción • ${artistName}` : 'Canción';
            
            if (!songId) {
                console.warn('⚠️ Canción sin ID:', song);
            }
            
            html += `
                <div class="content-search-item" data-type="song" data-id="${songId}" data-name="${songTitle}" data-image="${songImage}" data-artist="${artistName}">
                    <img src="${songImage}" alt="${songTitle}" class="content-search-item-image" onerror="this.src='../Assets/default-avatar.png'">
                    <div class="content-search-item-text">
                        <div class="content-search-item-name">${songTitle}</div>
                        <div class="content-search-item-type">${subtitle}</div>
                    </div>
                    <i class="fas fa-plus content-search-item-icon"></i>
                </div>
            `;
        });
    }
    
    // Álbumes después
    if (albums.length > 0) {
        albums.forEach(album => {
            const albumId = album.apiAlbumId || album.APIAlbumId || album.Id || album.id || album.AlbumId || album.albumId || '';
            const albumTitle = album.Title || album.title || album.Name || album.name || '';
            const albumImage = album.Image || album.image || '../Assets/default-avatar.png';
            const artistName = album.ArtistName || album.artistName || album.Artist || album.artist || '';
            const subtitle = artistName ? `Álbum • ${artistName}` : 'Álbum';
            
            if (!albumId) {
                console.warn('⚠️ Álbum sin ID:', album);
            }
            
            html += `
                <div class="content-search-item" data-type="album" data-id="${albumId}" data-name="${albumTitle}" data-image="${albumImage}" data-artist="${artistName}">
                    <img src="${albumImage}" alt="${albumTitle}" class="content-search-item-image" onerror="this.src='../Assets/default-avatar.png'">
                    <div class="content-search-item-text">
                        <div class="content-search-item-name">${albumTitle}</div>
s                  <div class="content-search-item-type">${subtitle}</div>
                    </div>
                    <i class="fas fa-plus content-search-item-icon"></i>
                </div>
            `;
        });
    }
    
    if (contentSearchDropdown) {
        contentSearchDropdown.innerHTML = html;
        contentSearchDropdown.style.display = 'block';
        
        contentSearchDropdown.querySelectorAll('.content-search-item').forEach(item => {
            item.addEventListener('click', function() {
                const contentType = this.getAttribute('data-type');
                
                if (contentType === 'artist') {
                    showAlert('No se pueden crear reseñas de artistas. Por favor, selecciona una canción o un álbum.', 'warning');
                    return;
                }
                
                const contentId = this.getAttribute('data-id');
             const contentName = this.getAttribute('data-name');
                const contentImage = this.getAttribute('data-image');
                const contentArtist = this.getAttribute('data-artist') || '';
                
                console.log('🎵 Contenido seleccionado:', { type: contentType, id: contentId, name: contentName, image: contentImage, artist: contentArtist });
                
                if (!contentId || contentId === '00000000-0000-0000-0000-000000000000' || contentId.trim() === '') {
                    console.error('❌ Error: El ID del contenido está vacío o es un GUID vacío');
                    showAlert('Error: No se pudo obtener el ID del contenido. El backend no está devolviendo un ID válido.', 'warning');
                    return;
                }
                
                const contentData = {
                    type: contentType,
                    id: contentId,
                    name: contentName,
                    image: contentImage,
                    artist: contentArtist
                };
                
                setSelectedContent(contentData);
                const contentSearchInput = document.getElementById('contentSearchInput');
                if (contentSearchInput) contentSearchInput.value = contentName;
            });
        });
    }
}

/**
 * Muestra el modal de "Crear Reseña", opcionalmente precargado con datos.
 */
function showCreateReviewModal(contentData = null) {
    const modal = document.getElementById('createReviewModalOverlay');
    const contentSelector = document.getElementById('createReviewContentSelector');
    const contentInfo = document.getElementById('createReviewContentInfo');
    const contentSearchInput = document.getElementById('contentSearchInput');
    const contentSearchDropdown = document.getElementById('contentSearchDropdown');
    
    if (!modal) return;
    
    if (contentData && contentData.type === 'artist') {
        showAlert('No se pueden crear reseñas de artistas. Por favor, selecciona una canción o un álbum.', 'warning');
        return;
    }
    
    if (contentData) {
        setSelectedContent(contentData);
    } else {
        currentReviewData = null;
        if (contentSelector) contentSelector.style.display = 'block';
        if (contentInfo) contentInfo.style.display = 'none';
        if (contentSearchInput) contentSearchInput.value = '';
        if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
    }
    
    const titleInput = document.getElementById('createReviewTitleInput');
    const textInput = document.getElementById('createReviewTextInput');
    if (titleInput) titleInput.value = '';
    if (textInput) textInput.value = '';
    
    const stars = document.querySelectorAll('#createReviewStars .star-input');
    stars.forEach(star => star.classList.remove('active'));
    
    modal.style.display = 'flex';
}
    
/**
 * Guarda los datos del contenido seleccionado y actualiza la UI del modal.
 */
function setSelectedContent(contentData) {
    if (contentData && contentData.type === 'artist') {
        showAlert('No se pueden crear reseñas de artistas.', 'warning');
        return;
    }
    
    currentReviewData = contentData;
    
    const contentSelector = document.getElementById('createReviewContentSelector');
    const contentInfo = document.getElementById('createReviewContentInfo');
    const contentInfoImage = document.getElementById('contentInfoImage');
    const contentInfoName = document.getElementById('contentInfoName');
    const contentInfoType = document.getElementById('contentInfoType');
    const contentSearchDropdown = document.getElementById('contentSearchDropdown');
    
    if (contentSelector) contentSelector.style.display = 'none';
    if (contentInfo) contentInfo.style.display = 'flex';
    if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
    
    if (contentInfoImage) {
        contentInfoImage.src = contentData.image || '../Assets/default-avatar.png';
        contentInfoImage.onerror = function() { this.src = '../Assets/default-avatar.png'; };
    }
    
    if (contentInfoName) {
        contentInfoName.textContent = contentData.name || 'Nombre';
    }
    
    if (contentInfoType) {
        const typeText = contentData.type === 'album' ? 'ÁLBUM' : 'CANCIÓN';
        contentInfoType.textContent = typeText;
    }
    
    if (contentInfo) {
        // Esta lógica era para artistas, que ya no se permiten
        contentInfo.classList.remove('content-info-artist');
        if (contentInfoImage) {
            contentInfoImage.style.borderRadius = '8px';
        }
    }
}
    
/**
 * Cierra y resetea el modal de "Crear Reseña".
 */
function hideCreateReviewModal() {
    const modal = document.getElementById('createReviewModalOverlay');
    if (modal) {
        modal.style.display = 'none';
        modal.removeAttribute('data-edit-review-id');
        const modalTitle = modal.querySelector('.create-review-title');
        if (modalTitle) {
            modalTitle.textContent = 'Crear Reseña';
        }
    }
    currentReviewData = null;
}
    
/**
 * REFACTORIZADA: Envía la reseña (nueva o editada) al backend.
 */
async function submitCreateReview() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        console.warn('⚠️ No hay token de autenticación');
        showAlert('Debes iniciar sesión para crear una reseña', 'warning');
        return;
    }
    
    // --- Validación de Inputs ---
    const titleInput = document.getElementById('createReviewTitleInput');
    const textInput = document.getElementById('createReviewTextInput');
    const createReviewStars = document.getElementById('createReviewStars');
    
    const title = titleInput ? titleInput.value.trim() : '';
    const content = textInput ? textInput.value.trim() : '';
    
    let rating = 0;
    if (createReviewStars) {
        const activeStars = createReviewStars.querySelectorAll('.star-input.active');
        rating = activeStars.length;
    }
    
    if (!title) {
        showAlert('Por favor, ingresa un título para la reseña', 'warning');
        return;
    }
    if (!content) {
        showAlert('Por favor, escribe tu reseña', 'warning');
        return;
    }
    if (rating === 0) {
        showAlert('Por favor, selecciona una calificación', 'warning');
        return;
    }
    
    const userId = localStorage.getItem('userId');
    const modal = document.getElementById('createReviewModalOverlay');
    const editReviewId = modal ? modal.getAttribute('data-edit-review-id') : null;
    const isEdit = !!editReviewId;
    
    if (isEdit) {
        // --- Lógica de Edición ---
        console.log('✏️ Modo edición detectado. ReviewId:', editReviewId);
        try {
            const reviewData = {
                UserId: String(userId).trim(),
                Rating: rating,
                Title: title,
                Content: content
            };
            
            await updateReview(editReviewId, reviewData, authToken);
            
            console.log('✅ Reseña editada exitosamente');
            showAlert('✅ Reseña editada exitosamente', 'success');
            hideCreateReviewModal();
            if (modal) modal.removeAttribute('data-edit-review-id');
            if (typeof loadReviews === 'function') {
                await loadReviews();
            }
        } catch (error) {
            console.error('❌ Error editando reseña:', error);
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || error.response.data?.Message || 'Error desconocido';
                if (status === 401) {
                    showAlert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'warning');                    setTimeout(() => { window.location.href = 'login.html'; }, 2000);
                } else if (status === 403) {
                    showAlert('No tienes permisos para editar esta reseña.', 'danger');
                } else if (status === 404) {
                    showAlert('La reseña no fue encontrada.', 'danger');
                } else {
                    showAlert(`Error al editar la reseña: ${message}`, 'danger');
                }
            } else {
                showAlert('Error al editar la reseña. Intenta nuevamente.', 'danger');
            }
        }
        return;
    }
    
    // --- Lógica de Creación ---
    try {
        if (!currentReviewData || !currentReviewData.id) {
            console.error('❌ currentReviewData inválido:', currentReviewData);
            showAlert('Error: No se seleccionó contenido.', 'warning');
            return;
        }
        
        let contentGuid = null;
        
        try {
            if (currentReviewData.type === 'song') {
                const songData = await getOrCreateSong(currentReviewData.id); 
                contentGuid = songData.songId || songData.SongId;
            } else if (currentReviewData.type === 'album') {
                const albumData = await getOrCreateAlbum(currentReviewData.id);
                contentGuid = albumData.albumId || albumData.AlbumId;
            }
        } catch (error) {
            console.error('❌ Error obteniendo Guid del Content Service:', error);
            showAlert(`Error al obtener el ID del contenido: ${error.message}.`, 'danger');
            return;
        }
        
        if (!contentGuid) {
            showAlert('Error: No se pudo obtener el ID del contenido (GUID).', 'warning');
            return;
        }
        
        const reviewData = {
            UserId: String(userId).trim(),
            Rating: rating,
            Title: title,
            Content: content,
            SongId: null,
            AlbumId: null
        };
        
        if (currentReviewData.type === 'song') {
            reviewData.SongId = String(contentGuid).trim();
        } else if (currentReviewData.type === 'album') {
            reviewData.AlbumId = String(contentGuid).trim();
        }
        
        const response = await createReview(reviewData, authToken);
        
        let reviewId = response?.ReviewId || response?.reviewId || response?.Id_Review || response?.id || 'N/A';
        if (reviewId !== 'N/A') reviewId = String(reviewId).trim();
        
        console.log('✅ Reseña guardada exitosamente. ID:', reviewId);
        
        if (reviewId !== 'N/A' && currentReviewData) {
            const storageKey = `review_content_${reviewId}`;
            localStorage.setItem(storageKey, JSON.stringify(currentReviewData));
            console.log(`💾 Datos del contenido guardados en localStorage: ${storageKey}`);
        }
        
        showAlert('✅ Reseña creada y guardada exitosamente', 'success');
        hideCreateReviewModal();
        
        setReviewFilter('recent');
        if (typeof window.reloadCarousel === 'function') {
            window.reloadCarousel();
        }
        
        setTimeout(() => showAlert('Tu reseña ya está visible en la lista', 'info'), 500);
        
    } catch (error) {
        console.error('❌ Error creando reseña:', error);
        if (error.response?.status === 409) {
            showAlert(`Ya creaste una reseña de este contenido.`, 'warning');
            hideCreateReviewModal();
        } else {
            showAlert('Error al crear la reseña. Intenta nuevamente.', 'danger');
        }
    }
}

    
    // --- Listeners de Estrellas (dentro del modal) ---
    if (createReviewStars) {
        const stars = createReviewStars.querySelectorAll('.star-input');
        let currentRating = 0;

        function highlightStars(rating) {
            stars.forEach((star, index) => {
                star.classList.toggle('active', (index + 1) <= rating);
            });
        }
        
        function updateStarRating(rating) {
            currentRating = rating;
            highlightStars(rating);
        }
            
        stars.forEach((star) => {
            star.addEventListener('click', function() {
                updateStarRating(parseInt(this.getAttribute('data-rating')));
            });
            star.addEventListener('mouseenter', function() {
                highlightStars(parseInt(this.getAttribute('data-rating')));
            });
        });
        
        createReviewStars.addEventListener('mouseleave', () => highlightStars(currentRating));
    }



    

    

async function showEditReviewModal(reviewId, title, content, rating) {
    const modal = document.getElementById('createReviewModalOverlay');
    if (!modal) {
        console.error('Modal de crear reseña no encontrado');
        return;
    }
    
    modal.setAttribute('data-edit-review-id', reviewId);
    
    const normalizedReviewId = String(reviewId).trim();
    const storageKey = `review_content_${normalizedReviewId}`;
    const storedContentData = localStorage.getItem(storageKey);
    
    console.log(`🔍 Cargando datos del contenido para edición (reviewId: ${reviewId})`);
    
    if (storedContentData) {
        try {
            const contentData = JSON.parse(storedContentData);
            
            currentReviewData = {
                type: contentData.type,
                id: contentData.id,
                name: contentData.name || '',
                artist: contentData.artist || '',
                image: contentData.image || '../Assets/default-avatar.png'
            };
            
            const contentInfoImage = document.getElementById('contentInfoImage');
            const contentInfoName = document.getElementById('contentInfoName');
            const contentInfoType = document.getElementById('contentInfoType');
            
            if (contentInfoImage) {
                contentInfoImage.src = currentReviewData.image;
                contentInfoImage.onerror = function() { this.src = '../Assets/default-avatar.png'; };
            }
            if (contentInfoName) contentInfoName.textContent = currentReviewData.name;
            if (contentInfoType) contentInfoType.textContent = currentReviewData.type === 'song' ? 'CANCIÓN' : 'ÁLBUM';
            
        } catch (e) {
            console.error('❌ Error parseando datos del contenido guardados:', e);
            showAlert('No se pudieron cargar los datos del contenido.', 'warning');
        }
    } else {
        console.warn(`⚠️ No se encontraron datos del contenido en localStorage para review ${reviewId}`);
        // TODO: En un futuro, podrías llamar a getReviewDetails aquí para buscar los datos.
        showAlert('No se encontraron los datos del contenido. La reseña se puede editar pero no se mostrará la info.', 'warning');
    }
    
    // Llenar los campos con los datos actuales
    const titleInput = document.getElementById('createReviewTitleInput');
    const textInput = document.getElementById('createReviewTextInput');
    const starsContainer = document.getElementById('createReviewStars');
    
    if (titleInput) titleInput.value = title;
    if (textInput) textInput.value = content;
    
    if (starsContainer) {
        const stars = starsContainer.querySelectorAll('.star-input');
        stars.forEach((star) => {
            const starRating = parseInt(star.getAttribute('data-rating'));
            star.classList.toggle('active', starRating <= rating);
        });
    }
    
    const modalTitle = modal.querySelector('.create-review-title');
    if (modalTitle) modalTitle.textContent = 'Editar Reseña';
    
    document.getElementById('createReviewContentSelector').style.display = 'none';
    document.getElementById('createReviewContentInfo').style.display = 'block';
    
    modal.style.display = 'flex';
}

// --- MODAL DE VISTA DETALLADA DE RESEÑA ---

async function showReviewDetailModal(reviewId) {
    const modal = document.getElementById('reviewDetailModalOverlay');
    if (!modal) return;
    
    modal.style.display = 'flex';
    const contentDiv = document.getElementById('reviewDetailContent');
    if (contentDiv) {
        contentDiv.innerHTML = '<div class="review-detail-loading">Cargando reseña...</div>';
    }
    
    try {
        const [reviewData, allReviews, comments, likes] = await Promise.all([
            getReviewDetails(reviewId),
            getReviews(), 
            getCommentsByReview(reviewId),
            getReviewReactionCount(reviewId)
        ]);
        
        const review = allReviews.find(r => (r.ReviewId || r.reviewId || r.id) === reviewId);
        
        if (!review && !reviewData) {
            throw new Error('Reseña no encontrada');
        }
        
        const fullReview = {
            ...review,
            ...reviewData?.review,
            user: reviewData?.user || {},
            song: reviewData?.song || {},
            album: reviewData?.album || {}
        };
        
        const storageKey = `review_content_${reviewId}`;
        const storedContentData = localStorage.getItem(storageKey);
        let contentData = null;
        if (storedContentData) {
            try { contentData = JSON.parse(storedContentData); } catch (e) {}
        }
        
        let songName = 'Canción', albumName = 'Álbum', artistName = 'Artista', contentType = 'song';
        
        if (contentData) {
            contentType = contentData.type || 'song';
            if (contentData.type === 'song') songName = contentData.name || songName;
            else albumName = contentData.name || albumName;
            artistName = contentData.artist || artistName;
        } else if (fullReview.song) {
            songName = fullReview.song.Title || fullReview.song.title || songName;
            artistName = fullReview.song.ArtistName || fullReview.song.artistName || artistName;
        } else if (fullReview.album) {
            albumName = fullReview.album.Title || fullReview.album.title || albumName;
            artistName = fullReview.album.ArtistName || fullReview.album.artistName || artistName;
        }
        
        const username = fullReview.user?.username || fullReview.user?.Username || 'Usuario';
        const avatar = fullReview.user?.imgProfile || fullReview.user?.ImgProfile || '../Assets/default-avatar.png';
        
        const reviewTitle = fullReview.Title || fullReview.title || '';
        const reviewContent = fullReview.Content || fullReview.content || '';
        const reviewRating = fullReview.Rating || fullReview.rating || 0;
        const createdAt = fullReview.CreatedAt || fullReview.Created || new Date();
        const timeAgo = formatNotificationTime(createdAt); 
        
        const currentUserId = localStorage.getItem('userId');
        const reviewUserId = fullReview.UserId || fullReview.userId || '';
        const isOwnReview = currentUserId && (String(reviewUserId) === String(currentUserId));
        
        let userLiked = false;
        if (currentUserId) {
            const storedReactionId = localStorage.getItem(`reaction_${reviewId}_${currentUserId}`);
            const localLike = localStorage.getItem(`like_${reviewId}_${currentUserId}`);
            userLiked = storedReactionId !== null || localLike === 'true';
        }
        
        const contentName = contentType === 'song' ? songName : albumName;
        
        if (contentDiv) {
            contentDiv.innerHTML = `
                <div class="review-detail-main">
                    <div class="review-detail-user">
                                            </div>
                    <div class="review-detail-meta">
                                            </div>
                    ${reviewTitle ? `<h2 class="review-detail-title">${reviewTitle}</h2>` : ''}
                    <p class="review-detail-text">${reviewContent}</p>
                    <div class="review-detail-rating">
                        <div class="review-detail-stars">${renderStars(reviewRating)}</div>
                    </div>
                    <div class="review-detail-interactions">
                        <button class="review-detail-interaction-btn ${userLiked ? 'liked' : ''}" 
                                data-review-id="${reviewId}" id="reviewDetailLikeBtn">
                                <i class="fas fa-heart" style="color: ${userLiked ? 'var(--magenta, #EC4899)' : 'rgba(255,255,255,0.7)'};"></i>
                                <span class="review-detail-likes-count">${likes}</span>
                            </button>
                            <span class="review-detail-comments-icon">
                                <i class="fas fa-comment"></i>
                                <span class="review-detail-comments-count">${comments.length}</span>
                            </span>
                        </div>
                    </div>
            `;
        }
        
        await loadReviewDetailComments(reviewId, comments); // Pasamos los comentarios que ya tenemos
        
        const likeBtn = document.getElementById('reviewDetailLikeBtn');
        if (likeBtn) {
            likeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (!localStorage.getItem('authToken')) return showLoginRequiredModal();
                toggleReviewLikeInDetail(reviewId, this);
            });
        }
        
        const inputAvatar = document.getElementById('reviewDetailInputAvatar');
        if (inputAvatar) {
            inputAvatar.src = localStorage.getItem('userAvatar') || '../Assets/default-avatar.png';
        }
        
    } catch (error) {
        console.error('Error cargando vista detallada:', error);
        if (contentDiv) contentDiv.innerHTML = '<div class="review-detail-loading">Error al cargar la reseña</div>';
    }
}
    
async function loadReviewDetailComments(reviewId, comments) {
    const commentsList = document.getElementById('reviewDetailCommentsList');
    const commentsCountEl = document.getElementById('reviewDetailCommentsCount');
    if (!commentsList) return;
    
    try {
        // Si no nos pasan los comentarios, los buscamos.
        if (!comments) {
            comments = await getCommentsByReview(reviewId);
        }
        
        if (commentsCountEl) commentsCountEl.textContent = comments.length;
        
        const currentUserIdRaw = localStorage.getItem('userId');
        const currentUserId = currentUserIdRaw ? String(currentUserIdRaw).trim() : null;
        
        if (comments.length === 0) {
            commentsList.innerHTML = `
                <div class="review-detail-comment-empty">
                    <i class="fas fa-comment-slash"></i>
                    <p>No hay comentarios aún. ¡Sé el primero en comentar!</p>
                </div>
            `;
        } else {
            commentsList.innerHTML = comments.map(comment => {
                // --- INICIO DE LÓGICA PEGADA ---
                const timeAgo = formatNotificationTime(comment.Created || comment.Created || comment.date);
                const username = comment.UserName || comment.username || 'Usuario';
                const text = comment.Text || comment.text || '';
                let commentId = comment.Id_Comment || comment.id_Comment || comment.IdComment || comment.idComment || comment.id || comment.Id || '';
                if (commentId) {
                    commentId = String(commentId).trim();
                }
                const commentUserId = comment.IdUser || comment.idUser || comment.Id_User || comment.id_user || comment.userId || '';
                const likes = comment.Likes || comment.likes || 0;
                const userLiked = comment.userLiked || false;
                
                const normalizedCommentUserId = commentUserId ? String(commentUserId).trim() : '';
                const normalizedCurrentUserId = currentUserId ? String(currentUserId).trim() : '';
                const isOwnComment = normalizedCurrentUserId && normalizedCommentUserId && 
                    normalizedCommentUserId.toLowerCase() === normalizedCurrentUserId.toLowerCase();
                
                let actionButtons = '';
                if (isOwnComment) {
                    actionButtons = `
                        <div class="review-detail-comment-actions">
                            <button class="review-detail-comment-action-btn comment-edit-btn" data-comment-id="${commentId}" title="Editar">
                                <i class="fas fa-pencil"></i>
                            </button>
                            <button class="review-detail-comment-action-btn comment-delete-btn" data-comment-id="${commentId}" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                      </div>
                    `;
                }
                
                return `
                    <div class="review-detail-comment-item" data-comment-id="${commentId}">
                        <img src="../Assets/default-avatar.png" alt="${username}" class="review-detail-comment-avatar" onerror="this.src='../Assets/default-avatar.png'">
                        <div class="review-detail-comment-content">
                    T       <div class="review-detail-comment-header">
                                <span class="review-detail-comment-username">${username}</span>
                                <span class="review-detail-comment-time">${timeAgo}</span>
                            </div>
                            <p class="review-detail-comment-text">${text}</p>
                            <div class="review-detail-comment-footer">
                             <button class="review-detail-comment-like-btn ${userLiked ? 'liked' : ''}" 
                                        data-comment-id="${commentId}">
                                    <i class="fa-solid fa-heart" style="color: ${userLiked ? 'var(--magenta, #EC4899)' : 'rgba(255,255,255,0.6)'};"></i>
                                    <span class="review-detail-comment-likes-count">${likes}</span>
                                </button>
                                ${actionButtons}
                 </div>
                        </div>
                    </div>
                `;
                // --- FIN DE LÓGICA PEGADA ---
     }).join('');
        }
        
        attachReviewDetailCommentListeners(reviewId);
    } catch (error) {
        console.error('Error cargando comentarios en vista detallada:', error);
        commentsList.innerHTML = '<div class="review-detail-comment-empty">Error al cargar comentarios.</div>';
    }
}
    
function attachReviewDetailCommentListeners(reviewId) {
    document.querySelectorAll('.review-detail-comment-like-btn').forEach(btn => {
            // Verificar si ya tiene un listener (usando un atributo de datos)
            if (!btn.hasAttribute('data-listener-attached')) {
                btn.setAttribute('data-listener-attached', 'true');
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const commentId = this.getAttribute('data-comment-id');
                    if (commentId) {
                        toggleCommentLikeInDetail(commentId, this, reviewId);
                    }
                });
            }
        });
        
        // Botones de editar
        document.querySelectorAll('.review-detail-comment-item .comment-edit-btn').forEach(btn => {
            // Verificar si ya tiene un listener
            if (!btn.hasAttribute('data-listener-attached')) {
                btn.setAttribute('data-listener-attached', 'true');
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const commentId = this.getAttribute('data-comment-id');
                    if (commentId) {
                        editCommentInDetail(commentId, reviewId);
                    }
                });
            }
        });
        
        // Botones de eliminar
        document.querySelectorAll('.review-detail-comment-item .comment-delete-btn').forEach(btn => {
            // Verificar si ya tiene un listener
            if (!btn.hasAttribute('data-listener-attached')) {
                btn.setAttribute('data-listener-attached', 'true');
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const commentId = this.getAttribute('data-comment-id');
                    if (commentId) {
                        deleteCommentInDetail(commentId, reviewId);
                    }
                });
            }
        });
}
    
async function toggleCommentLikeInDetail(commentId, btn, reviewId) {
    const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showLoginRequiredModal();
            return;
        }
        
        const icon = btn.querySelector('i');
        const likesSpan = btn.querySelector('.review-detail-comment-likes-count');
        const isLiked = btn.classList.contains('liked');
        const currentLikes = parseInt(likesSpan.textContent) || 0;
        
        // Actualizar visualmente
        if (isLiked) {
            btn.classList.remove('liked');
            icon.style.color = 'rgba(255,255,255,0.6)';
            likesSpan.textContent = Math.max(0, currentLikes - 1);
        } else {
            btn.classList.add('liked');
            icon.style.color = 'var(--magenta, #EC4899)';
            likesSpan.textContent = currentLikes + 1;
        }
        
        // TODO: Enviar like al backend cuando esté disponible
        // Por ahora solo simulamos
        if (authToken.startsWith('dev-token-')) {
            console.log('Like en comentario simulado (vista detallada):', commentId);
        }
}
    
function editCommentInDetail(commentId, reviewId) {
    console.log('🔍 [DEBUG] editCommentInDetail llamado con commentId:', commentId, 'reviewId:', reviewId);
        
        const commentItem = document.querySelector(`.review-detail-comment-item[data-comment-id="${commentId}"]`);
        const commentTextElement = commentItem?.querySelector('.review-detail-comment-text');
        
        console.log('🔍 [DEBUG] commentItem:', commentItem, 'commentTextElement:', commentTextElement);
        
        if (!commentItem || !commentTextElement) {
            console.error('❌ [DEBUG] No se encontró commentItem o commentTextElement en vista detallada');
            return;
        }
        
        // Si ya está en modo edición, no hacer nada
        if (commentItem.classList.contains('editing')) {
            console.warn('⚠️ [DEBUG] El comentario ya está en modo edición');
            return;
        }
        
        // Guardar el texto original
        originalCommentText = commentTextElement.textContent.trim();
        editingCommentId = commentId;
        
        console.log('✅ [DEBUG] editingCommentId guardado:', editingCommentId);
        
        // Obtener el texto actual
        const currentText = originalCommentText;
        
        // Crear textarea para edición
        const textarea = document.createElement('textarea');
        textarea.className = 'comment-text-edit';
        textarea.id = `comment-text-edit-${commentId}`;
        textarea.value = currentText;
        textarea.maxLength = 500;
        textarea.rows = 3;
        textarea.setAttribute('data-comment-id', commentId);
        
        // Crear contenedor de botones
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'comment-edit-buttons';
        buttonsContainer.setAttribute('data-comment-id', commentId);
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'comment-edit-action-btn comment-edit-cancel';
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.type = 'button';
        cancelBtn.setAttribute('data-comment-id', commentId);
        cancelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const btnCommentId = this.getAttribute('data-comment-id') || commentId;
            cancelEditCommentInDetail(btnCommentId);
        });
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'comment-edit-action-btn comment-edit-confirm';
        confirmBtn.textContent = 'Confirmar';
        confirmBtn.type = 'button';
        confirmBtn.setAttribute('data-comment-id', commentId);
        confirmBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const btnCommentId = this.getAttribute('data-comment-id') || commentId;
            confirmEditCommentInDetail(btnCommentId, reviewId);
        });
        
        buttonsContainer.appendChild(cancelBtn);
        buttonsContainer.appendChild(confirmBtn);
        
        // Reemplazar el elemento de texto con el textarea
        commentTextElement.replaceWith(textarea);
        
        // Agregar botones después del textarea
        textarea.parentNode.insertBefore(buttonsContainer, textarea.nextSibling);
            
        // Marcar el comentario como en edición
        commentItem.classList.add('editing');
        
        // Ocultar el footer mientras se edita
        const commentFooter = commentItem.querySelector('.review-detail-comment-footer');
        if (commentFooter) {
            commentFooter.style.display = 'none';
        }
        
        // Enfocar el textarea
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }, 10);
}
    
function cancelEditCommentInDetail(commentId) {
   const commentItem = document.querySelector(`.review-detail-comment-item[data-comment-id="${commentId}"]`);
        if (!commentItem) return;
        
        const textarea = document.getElementById(`comment-text-edit-${commentId}`);
        const buttonsContainer = commentItem.querySelector('.comment-edit-buttons');
        const commentFooter = commentItem.querySelector('.review-detail-comment-footer');
        
        if (textarea) {
            // Restaurar el elemento de texto original
            const commentTextElement = document.createElement('p');
            commentTextElement.className = 'review-detail-comment-text';
            commentTextElement.textContent = originalCommentText;
            
            textarea.replaceWith(commentTextElement);
        }
    
        // Eliminar botones de edición
        if (buttonsContainer) {
            buttonsContainer.remove();
        }
        
        // Mostrar el footer nuevamente
        if (commentFooter) {
            commentFooter.style.display = 'flex';
        }
        
        // Remover clase de edición
        commentItem.classList.remove('editing');
        
        // Limpiar variables
        editingCommentId = null;
        originalCommentText = null;
}
    
async function confirmEditCommentInDetail(commentId, reviewId) {
   console.log('🔍 [DEBUG] confirmEditCommentInDetail llamado con commentId:', commentId, 'reviewId:', reviewId);
        
        if (!commentId || commentId === '') {
            console.error('❌ [DEBUG] No se pudo obtener commentId');
            showAlert('Error: No se pudo identificar el comentario a editar', 'danger');
            return;
        }
        
        if (!editingCommentId || editingCommentId !== commentId) {
            editingCommentId = commentId;
        }
        
        const textarea = document.getElementById(`comment-text-edit-${commentId}`);
        
        if (!reviewId || !textarea) {
            console.error('❌ [DEBUG] Falta reviewId o textarea');
            if (!reviewId) {
                showAlert('Error: No se pudo identificar la reseña', 'danger');
            } else if (!textarea) {
                showAlert('Error: No se encontró el campo de edición', 'danger');
            }
            return;
        }
        
        const newText = textarea.value.trim();
        if (!newText) {
            showAlert('El comentario no puede estar vacío', 'warning');
            return;
        }
        
        try {
            // Actualizar comentario
            await updateComment(commentId, newText, authToken);
        
            // Recargar comentarios en la vista detallada
            await loadReviewDetailComments(reviewId);
        
            showAlert('Comentario editado exitosamente', 'success');
        } catch (error) {
            console.error('❌ Error al actualizar comentario:', error);
            showAlert('Error al actualizar el comentario. Por favor, intenta nuevamente.', 'danger');
        }
        
        // Limpiar variables
        editingCommentId = null;
        originalCommentText = null;
}
    
async function deleteCommentInDetail(commentId, reviewId) {
    if (!commentId || !reviewId) {
            console.error('Falta commentId o reviewId para eliminar');
            return;
        }
        
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showLoginRequiredModal();
            return;
        }
        
        // Confirmar eliminación
        if (!confirm('¿Estás seguro de que quieres eliminar este comentario?')) {
            return;
        }
        
        try {
            // Eliminar del backend
            if (!authToken.startsWith('dev-token-')) {
                const GATEWAY_BASE_URL = 'http://localhost:5000';
                try {
                    await axios.delete(`${GATEWAY_BASE_URL}/api/gateway/comments/${commentId}`, {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 5000
                    });
                } catch (error) {
                    // Si falla el gateway, intentar con el Social Service directamente
                    const SOCIAL_API_BASE_URL = 'http://localhost:8002';
                    await axios.delete(`${SOCIAL_API_BASE_URL}/api/Comments/${commentId}`, {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 5000
                    });
                }
            }
            
            // Recargar comentarios en la vista detallada
            await loadReviewDetailComments(reviewId);
            
            // Actualizar contador
            const commentsCount = document.getElementById('reviewDetailCommentsCount');
            if (commentsCount) {
                const comments = await getComments(reviewId);
                commentsCount.textContent = comments.length;
            }
            
            showAlert('Comentario eliminado exitosamente', 'success');
        } catch (error) {
            console.error('Error eliminando comentario:', error);
            showAlert('Error al eliminar el comentario', 'danger');
        }
   
}
    
async function toggleReviewLikeInDetail(reviewId, btn) {
    const icon = btn.querySelector('i');
        const likesSpan = btn.querySelector('.review-detail-likes-count');
        const isLiked = btn.classList.contains('liked');
        
        if (isLiked) {
            btn.classList.remove('liked');
            icon.style.color = 'rgba(255,255,255,0.7)';
            const currentLikes = parseInt(likesSpan.textContent) || 0;
            likesSpan.textContent = Math.max(0, currentLikes - 1);
            await sendLikeToBackend(reviewId);
        } else {
            btn.classList.add('liked');
            icon.style.color = 'var(--magenta, #EC4899)';
            const currentLikes = parseInt(likesSpan.textContent) || 0;
            likesSpan.textContent = currentLikes + 1;
            await sendLikeToBackend(reviewId);
        }

}
    
function hideReviewDetailModal() {
    const modal = document.getElementById('reviewDetailModalOverlay');
    if (modal) modal.style.display = 'none';
}

// --- MODAL DE COMENTARIOS (POPUP) ---

function initializeCommentsModalLogic() {
    const closeCommentsModal = document.getElementById('closeCommentsModal');
    const submitCommentBtn = document.getElementById('submitCommentBtn');
    const commentInput = document.getElementById('commentInput');
    const commentsModalOverlay = document.getElementById('commentsModalOverlay');
    
    if (closeCommentsModal) {
        closeCommentsModal.addEventListener('click', hideCommentsModal);
    }
    if (submitCommentBtn) {
        submitCommentBtn.addEventListener('click', submitComment);
    }
    if (commentInput) {
        commentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitComment();
        });
    }
    if (commentsModalOverlay) {
        commentsModalOverlay.addEventListener('click', (e) => {
            if (e.target === commentsModalOverlay) hideCommentsModal();
        });
    }
}
    
async function showCommentsModal(reviewId) {
    const modal = document.getElementById('commentsModalOverlay');
    if (!modal) return;
    
    modal.setAttribute('data-review-id', reviewId);
    modal.style.display = 'flex';
    
    await loadCommentsIntoModal(reviewId);
}
    
// Pega esto en tu JavaScript/Admin/homeAdmin.js

async function loadCommentsIntoModal(reviewId) {
    const commentsList = document.getElementById('commentsList');
    const commentsCount = document.getElementById('commentsCount');
    if (!commentsList || !commentsCount) return;
    
    commentsList.innerHTML = '<div class="comment-empty">Cargando...</div>'; // Loading state
    
    try {
        // ¡LLAMADA A API REFACTORIZADA!
        const comments = await getCommentsByReview(reviewId);
        
        commentsCount.textContent = comments.length;
        
        const currentUserIdRaw = localStorage.getItem('userId');
        const currentUserId = currentUserIdRaw ? String(currentUserIdRaw).trim() : null;
        const currentUsername = localStorage.getItem('username') || 'Usuario';
        
        if (comments.length === 0) {
            commentsList.innerHTML = `
                <div class="comment-empty">
                    <i class="fas fa-comment-slash"></i>
                    <p>No hay comentarios aún. ¡Sé el primero en comentar!</p>
                </div>
            `;
        } else {
            commentsList.innerHTML = comments.map(comment => {
                // --- INICIO DE LÓGICA PEGADA ---
                const date = new Date(comment.Created || comment.Created || comment.date);
                const timeAgo = formatNotificationTime(comment.Created || comment.Created || comment.date); // Asume que formatNotificationTime está en este archivo
                const username = comment.UserName || comment.username || 'Usuario';
                const text = comment.Text || comment.text || '';
                let commentId = comment.Id_Comment || comment.id_Comment || comment.IdComment || comment.idComment || comment.id || comment.Id || '';
                if (commentId) {
                    commentId = String(commentId).trim();
                }
                const commentUserId = comment.IdUser || comment.idUser || comment.Id_User || comment.id_user || comment.userId || '';
                const likes = comment.Likes || comment.likes || 0;
                const userLiked = comment.userLiked || false;
                
                if (!commentId || commentId === '' || commentId === 'null' || commentId === 'undefined') {
                    console.error('❌ [DEBUG] commentId inválido o vacío para comentario:', comment);
                    commentId = `temp-comment-${Date.now()}-${Math.random()}`;
                    console.warn('⚠️ [DEBUG] Usando ID temporal:', commentId);
                }
                
                const normalizedCommentUserId = commentUserId ? String(commentUserId).trim() : '';
                const normalizedCurrentUserId = currentUserId ? String(currentUserId).trim() : '';
                
                const isOwnComment = normalizedCurrentUserId && normalizedCommentUserId && 
                    normalizedCommentUserId.toLowerCase() === normalizedCurrentUserId.toLowerCase();
                
                let actionButtons = '';
                if (isOwnComment) {
                    actionButtons = `
                        <div class="comment-actions">
                            <button class="comment-action-btn comment-edit-btn" data-comment-id="${commentId}" title="Editar">
                                <i class="fas fa-pencil"></i>
                            </button>
                            <button class="comment-action-btn comment-delete-btn" data-comment-id="${commentId}" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                } else {
                    actionButtons = `
                        <div class="comment-actions">
                            <button class="comment-action-btn comment-report-btn" data-comment-id="${commentId}" title="Reportar">
                                <i class="fas fa-flag"></i>
                            </button>
                        </div>
                    `;
                }
                
                return `
                <div class="comment-item" data-comment-id="${commentId}">
                    <div class="comment-avatar">
                        <img src="../Assets/default-avatar.png" alt="${username}">
                    </div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <span class="comment-username">${username}</span>
                        <span class="comment-time">${timeAgo}</span>
                        </div>
                        <p class="comment-text" id="comment-text-${commentId}">${text}</p>
                    <div class="comment-footer">
                            <button class="comment-like-btn ${userLiked ? 'liked' : ''}" 
                                    data-comment-id="${commentId}" 
                        s         title="Me gusta">
                                    <i class="fa-solid fa-heart" style="color: ${userLiked ? 'var(--magenta, #EC4899)' : 'rgba(255,255,255,0.6)'};"></i>
                                    <span class="comment-likes-count">${likes}</span>
                                </button>
                                ${actionButtons}
                            </div>
                        </div>
                    </div>
                `;
                // --- FIN DE LÓGICA PEGADA ---
            }).join('');
        }
        
        attachCommentActionListeners(); // Asume que esta función está en este archivo
    } catch (error) {
        console.error("Error cargando comentarios en modal:", error);
        commentsList.innerHTML = `<div class="comment-empty">Error al cargar comentarios.</div>`;
    }
    
    // Actualizar contador en el botón de comentarios de la reseña
    const commentBtn = document.querySelector(`.comment-btn[data-review-id="${reviewId}"]`);
    if (commentBtn) {
        const countSpan = commentBtn.querySelector('.review-comments-count');
        if (countSpan) {
            const comments = await getCommentsByReview(reviewId); // Volvemos a llamar para estar seguros
            countSpan.textContent = comments.length;
        }
    }
}
    
function hideCommentsModal() {
    const modal = document.getElementById('commentsModalOverlay');
    if (modal) modal.style.display = 'none';
}
    
async function submitComment() {
    const modal = document.getElementById('commentsModalOverlay');
    const reviewId = modal ? modal.getAttribute('data-review-id') : null;
    const commentInput = document.getElementById('commentInput');
    
    if (!reviewId || !commentInput) return;
    
    const commentText = commentInput.value.trim();
    if (!commentText) {
        showAlert('Por favor, escribe un comentario', 'warning');
        return;
    }
    
    try {
        const authToken = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        
        // ¡LLAMADA A API REFACTORIZADA!
        await createComment(reviewId, commentText, userId, authToken);
        
        commentInput.value = '';
        await loadCommentsIntoModal(reviewId); // Recargar
        
        // Actualizar vista detallada si está abierta
        const reviewDetailModal = document.getElementById('reviewDetailModalOverlay');
        if (reviewDetailModal && reviewDetailModal.style.display === 'flex') {
            const detailComments = await getCommentsByReview(reviewId);
            await loadReviewDetailComments(reviewId, detailComments);
            const commentsCount = document.getElementById('reviewDetailCommentsCount');
            if (commentsCount) commentsCount.textContent = detailComments.length;
        }
        
        showAlert('Comentario agregado exitosamente', 'success');
    } catch (error) {
        console.error('Error agregando comentario:', error);
        showAlert('Error al agregar el comentario', 'danger');
    }
}
    
function attachCommentActionListeners() {
    document.querySelectorAll('.comment-edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const commentId = this.getAttribute('data-comment-id');
            editComment(commentId);
        });
    });
    
    document.querySelectorAll('.comment-delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const commentId = this.getAttribute('data-comment-id');
            deleteComment(commentId);
        });
    });
    
    document.querySelectorAll('.comment-report-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const commentId = this.getAttribute('data-comment-id');
            reportComment(commentId);
        });
    });
    
    document.querySelectorAll('.comment-like-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const commentId = this.getAttribute('data-comment-id');
            toggleCommentLike(commentId, this);
        });
    });
}
    
async function toggleCommentLike(commentId, btn) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) { return showLoginRequiredModal(); }
    
    const icon = btn.querySelector('i');
    const likesSpan = btn.querySelector('.comment-likes-count');
    const isLiked = btn.classList.contains('liked');
    const currentLikes = parseInt(likesSpan.textContent) || 0;
    
    if (isLiked) {
        btn.classList.remove('liked');
        icon.style.color = 'rgba(255,255,255,0.6)';
        likesSpan.textContent = Math.max(0, currentLikes - 1);
    } else {
        btn.classList.add('liked');
        icon.style.color = 'var(--magenta, #EC4899)';
        likesSpan.textContent = currentLikes + 1;
    }
    
    // TODO: Conectar esto con addCommentReaction y deleteCommentReaction
    if (authToken.startsWith('dev-token-')) {
        console.log('Like en comentario simulado:', commentId);
    }
}
    
function editComment(commentId) { // Wrapper para 'showEditCommentModal'
    showEditCommentModal(commentId);
}

function showEditCommentModal(commentId) {
    const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    const commentTextElement = document.getElementById(`comment-text-${commentId}`);
    if (!commentItem || !commentTextElement) return;
    if (commentItem.classList.contains('editing')) return;
    
    originalCommentText = commentTextElement.textContent.trim();
    editingCommentId = commentId;
    
    const currentText = originalCommentText;
    
    const textarea = document.createElement('textarea');
    textarea.className = 'comment-text-edit';
    textarea.id = `comment-text-edit-${commentId}`;
    textarea.value = currentText;
    textarea.maxLength = 500;
    textarea.rows = 3;
    textarea.setAttribute('data-comment-id', commentId);
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'comment-edit-buttons';
    buttonsContainer.setAttribute('data-comment-id', commentId);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'comment-edit-action-btn comment-edit-cancel';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.type = 'button';
    cancelBtn.setAttribute('data-comment-id', commentId);
    cancelBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        cancelEditComment(commentId);
    });
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'comment-edit-action-btn comment-edit-confirm';
    confirmBtn.textContent = 'Confirmar';
    confirmBtn.type = 'button';
    confirmBtn.setAttribute('data-comment-id', commentId);
    confirmBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        confirmEditComment(commentId);
    });
    
    buttonsContainer.appendChild(cancelBtn);
    buttonsContainer.appendChild(confirmBtn);
    
    commentTextElement.replaceWith(textarea);
    textarea.parentNode.insertBefore(buttonsContainer, textarea.nextSibling);
        
    commentItem.classList.add('editing');
    
    const commentFooter = commentItem.querySelector('.comment-footer');
    if (commentFooter) commentFooter.style.display = 'none';
    
    setTimeout(() => textarea.focus(), 10);
}
    
function cancelEditComment(commentId) {
    const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    if (!commentItem) return;
    
    const textarea = document.getElementById(`comment-text-edit-${commentId}`);
    const buttonsContainer = commentItem.querySelector('.comment-edit-buttons');
    const commentFooter = commentItem.querySelector('.comment-footer');
    
    if (textarea) {
        const commentTextElement = document.createElement('p');
        commentTextElement.className = 'comment-text';
        commentTextElement.id = `comment-text-${commentId}`;
        commentTextElement.textContent = originalCommentText;
        textarea.replaceWith(commentTextElement);
    }
    
    if (buttonsContainer) buttonsContainer.remove();
    if (commentFooter) commentFooter.style.display = 'flex';
    
    commentItem.classList.remove('editing');
    
    editingCommentId = null;
    originalCommentText = null;
}
    
async function confirmEditComment(commentId) {
    if (!commentId) {
        commentId = editingCommentId;
    }
    if (!commentId) {
        showAlert('Error: No se pudo identificar el comentario a editar', 'danger');
        return;
    }
    
    const modal = document.getElementById('commentsModalOverlay');
    const reviewId = modal ? modal.getAttribute('data-review-id') : null;
    const textarea = document.getElementById(`comment-text-edit-${commentId}`);
    
    if (!reviewId || !textarea) {
        showAlert('Error: No se pudo encontrar la reseña o el campo de edición', 'danger');
        return;
    }
    
    const newText = textarea.value.trim();
    if (!newText) {
        showAlert('El comentario no puede estar vacío', 'warning');
        return;
    }
    
    try {
        await updateCommentInData(reviewId, commentId, newText); // Llama al helper
        await loadCommentsIntoModal(reviewId); // Recarga el modal de comentarios
        
        const reviewDetailModal = document.getElementById('reviewDetailModalOverlay');
        if (reviewDetailModal && reviewDetailModal.style.display === 'flex') {
            await loadReviewDetailComments(reviewId); // Recarga el modal de detalle
        }
        
        showAlert('Comentario editado exitosamente', 'success');
    } catch (error) {
        console.error('❌ Error al actualizar comentario:', error);
        showAlert('Error al actualizar el comentario. Por favor, intenta nuevamente.', 'danger');
    }
    
    editingCommentId = null;
    originalCommentText = null;
}
    
async function updateCommentInData(reviewId, commentId, newText) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        console.error('No hay token para actualizar comentario');
        throw new Error("No autenticado");
    }
    
    if (authToken.startsWith('dev-token-')) {
        if (commentsData[reviewId]) {
            const comment = commentsData[reviewId].find(c => (c.Id_Comment || c.id) === commentId);
            if (comment) {
                comment.Text = newText;
                comment.Updated = new Date().toISOString();
            }
            return;
        }
    }
    
    // ¡LLAMADA A API REFACTORIZADA!
    await updateComment(commentId, newText, authToken);
}
    
// --- MODAL DE BORRAR COMENTARIO ---

function initializeDeleteModalsLogic() {
    // Modal de Borrar Comentario
    const cancelDeleteCommentBtn = document.getElementById('cancelDeleteCommentBtn');
    const confirmDeleteCommentBtn = document.getElementById('confirmDeleteCommentBtn');
    const deleteCommentModalOverlay = document.getElementById('deleteCommentModalOverlay');
    
    if (cancelDeleteCommentBtn) {
        cancelDeleteCommentBtn.addEventListener('click', hideDeleteCommentModal);
    }
    if (confirmDeleteCommentBtn) {
        confirmDeleteCommentBtn.addEventListener('click', confirmDeleteComment);
    }
    if (deleteCommentModalOverlay) {
        deleteCommentModalOverlay.addEventListener('click', (e) => {
            if (e.target === deleteCommentModalOverlay) hideDeleteCommentModal();
        });
    }
    
    // Modal de Borrar Reseña
    const cancelDeleteReviewBtn = document.getElementById('cancelDeleteReviewBtn');
    const confirmDeleteReviewBtn = document.getElementById('confirmDeleteReviewBtn');
    const deleteReviewModalOverlay = document.getElementById('deleteReviewModalOverlay');
    
    if (cancelDeleteReviewBtn) {
        cancelDeleteReviewBtn.addEventListener('click', hideDeleteReviewModal);
    }
    if (confirmDeleteReviewBtn) {
        confirmDeleteReviewBtn.addEventListener('click', confirmDeleteReview);
    }
    if (deleteReviewModalOverlay) {
        deleteReviewModalOverlay.addEventListener('click', (e) => {
            if (e.target === deleteReviewModalOverlay) hideDeleteReviewModal();
        });
    }
}

//function deleteComment(commentId) { // Wrapper para 'showDeleteCommentModal'
  //  showDeleteCommentModal(commentId);
//}

function showDeleteCommentModal(commentId) {
    deletingCommentId = commentId;
    const modal = document.getElementById('deleteCommentModalOverlay');
    if(modal) modal.style.display = 'flex';
}
    
function hideDeleteCommentModal() {
    const modal = document.getElementById('deleteCommentModalOverlay');
    if(modal) modal.style.display = 'none';
    deletingCommentId = null;
}
    
async function confirmDeleteComment() {
    if (!deletingCommentId) return;
    
    const modal = document.getElementById('commentsModalOverlay');
    const reviewId = modal ? modal.getAttribute('data-review-id') : null;
    if (!reviewId) return;
    
    const authToken = localStorage.getItem('authToken');
    
    try {
        // ¡LLAMADA A API REFACTORIZADA!
        // (La lógica dev-mode ya está en la API)
        await deleteComment(deletingCommentId, authToken);
        
        hideDeleteCommentModal();
        await loadCommentsIntoModal(reviewId);
        
        // Actualizar vista detallada si está abierta
        const reviewDetailModal = document.getElementById('reviewDetailModalOverlay');
        if (reviewDetailModal && reviewDetailModal.style.display === 'flex') {
            const comments = await getCommentsByReview(reviewId);
            await loadReviewDetailComments(reviewId, comments);
            const commentsCount = document.getElementById('reviewDetailCommentsCount');
            if (commentsCount) commentsCount.textContent = comments.length;
        }
        
        showAlert('Comentario eliminado exitosamente', 'success');
    } catch (error) {
        console.error('Error eliminando comentario:', error);
        showAlert('Error al eliminar el comentario', 'danger');
        hideDeleteCommentModal();
    }
}
    
// --- MODAL DE BORRAR RESEÑA ---

function showDeleteReviewModal(reviewId, reviewTitle) {
    if (!reviewId) {
        console.error('❌ ReviewId inválido (null/undefined):', reviewId);
        showAlert('Error: No se pudo identificar la reseña a eliminar', 'danger');
        return;
    }
    
    reviewId = String(reviewId).trim();
    
    if (reviewId === '' || reviewId === 'null' || reviewId === 'undefined') {
        console.error('❌ ReviewId inválido (vacío/null/undefined):', reviewId);
        showAlert('Error: No se pudo identificar la reseña a eliminar', 'danger');
        return;
    }
    
    deletingReviewId = reviewId;
    
    const modal = document.getElementById('deleteReviewModalOverlay');
    const messageElement = document.getElementById('deleteReviewMessage');
    
    if (modal && messageElement) {
        messageElement.textContent = `¿Estás seguro de que quieres eliminar la reseña "${reviewTitle}"? Esta acción no se puede deshacer.`;
        modal.style.display = 'flex';
    } else {
        console.error('❌ Modal de eliminación de reseña no encontrado');
    }
}
    
function hideDeleteReviewModal() {
    const modal = document.getElementById('deleteReviewModalOverlay');
    if (modal) modal.style.display = 'none';
    deletingReviewId = null;
}
    
async function confirmDeleteReview() {
    if (!deletingReviewId) {
        showAlert('Error: No se pudo identificar la reseña a eliminar', 'danger');
        return;
    }
    
    const reviewIdToDelete = deletingReviewId;
    hideDeleteReviewModal();
    
    await deleteReviewLogic(reviewIdToDelete);
}
    

async function deleteReviewLogic(reviewId) {
    const userId = localStorage.getItem('userId');
    const authToken = localStorage.getItem('authToken');
    
    if (!userId || !authToken) {
        showAlert('Debes iniciar sesión para eliminar reseñas', 'warning');
        return;
    }
    
    console.log('🗑️ Eliminando reseña:', { reviewId, userId });
    
    try {
        // ¡LLAMADA A API REFACTORIZADA!
        await deleteReview(reviewId, userId, authToken);
        
        showAlert('✅ Reseña eliminada exitosamente', 'success');
        
        if (typeof loadReviews === 'function') {
            await loadReviews();
        }
    } catch (error) {
        console.error('Error eliminando reseña:', error);
        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || error.response.data?.Message || 'Error desconocido';
                
            if (status === 409) {
                showAlert('No se puede eliminar la reseña porque tiene likes o comentarios.', 'warning');
            } else if (status === 404) {
                showAlert('La reseña no fue encontrada.', 'danger');
            } else if (status === 401) {
                showAlert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'warning');
                setTimeout(() => {
                    window.location.href = 'login.html'; // (Ajustar ruta si es necesario)
                }, 2000);
            } else if (status === 403) {
                showAlert('No tienes permisos para eliminar esta reseña.', 'danger');
            } else {
                showAlert(`Error al eliminar la reseña: ${message}`, 'danger');
            }
        } else {
            showAlert('Error al eliminar la reseña. Intenta nuevamente.', 'danger');
        }
    }
}
    
// --- MODAL DE REPORTAR ---

function initializeReportModalLogic() {
    const cancelReportCommentBtn = document.getElementById('cancelReportCommentBtn');
    const confirmReportCommentBtn = document.getElementById('confirmReportCommentBtn');
    const reportCommentModalOverlay = document.getElementById('reportCommentModalOverlay');
    const reportRadios = document.querySelectorAll('.report-radio');
    const reportCommentTextarea = document.getElementById('reportCommentTextarea');
    
    if (cancelReportCommentBtn) {
        cancelReportCommentBtn.addEventListener('click', hideReportCommentModal);
    }
    if (confirmReportCommentBtn) {
        confirmReportCommentBtn.addEventListener('click', confirmReportComment);
    }
    if (reportCommentModalOverlay) {
        reportCommentModalOverlay.addEventListener('click', (e) => {
            if (e.target === reportCommentModalOverlay) hideReportCommentModal();
        });
    }
    
    if (reportRadios.length > 0) {
        reportRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                const confirmBtn = document.getElementById('confirmReportCommentBtn');
                if (confirmBtn) confirmBtn.disabled = false;
                
                if (this.value === 'other' && reportCommentTextarea) {
                    reportCommentTextarea.style.display = 'block';
                } else if (reportCommentTextarea) {
                    reportCommentTextarea.style.display = 'none';
                }
            });
        });
    }
}

function reportComment(commentId) {
    showReportCommentModal(commentId);
}
function reportReview(reviewId) {
    // TODO: Podríamos adaptar este modal para reportar reseñas también
    showAlert('Funcionalidad de reportar reseña en desarrollo.', 'info');
}

function showReportCommentModal(commentId) {
    reportingCommentId = commentId; // O 'reviewId' si adaptamos
    const modal = document.getElementById('reportCommentModalOverlay');
    const textarea = document.getElementById('reportCommentTextarea');
    const confirmBtn = document.getElementById('confirmReportCommentBtn');
    
    document.querySelectorAll('.report-radio').forEach(radio => radio.checked = false);
    if (textarea) {
        textarea.value = '';
        textarea.style.display = 'none';
    }
    if (confirmBtn) confirmBtn.disabled = true;
    if (modal) modal.style.display = 'flex';
}
    
function hideReportCommentModal() {
    const modal = document.getElementById('reportCommentModalOverlay');
    if(modal) modal.style.display = 'none';
    reportingCommentId = null;
}
    
async function confirmReportComment() {
    if (!reportingCommentId) return;
    
    const selectedReason = document.querySelector('.report-radio:checked');
    if (!selectedReason) {
        showAlert('Por favor, selecciona un motivo para el reporte', 'warning');
        return;
    }
    
    const reason = selectedReason.value;
    const textarea = document.getElementById('reportCommentTextarea');
    const additionalInfo = textarea ? textarea.value.trim() : '';
    
    // TODO: Implementar 'reportComment' en socialApi.js
    const reportData = {
        commentId: reportingCommentId,
        reason: reason,
        additionalInfo: additionalInfo
    };
    
    console.log('Reportar comentario:', reportData);
    
    hideReportCommentModal();
    showAlert('Comentario reportado. Gracias por tu reporte.', 'success');
}



// --- 8. FUNCIONES DE UTILIDAD (Alerts) ---
function showAlert(message, type) {
        const existingAlerts = document.querySelectorAll('.custom-alert');
        existingAlerts.forEach(alert => alert.remove());

        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert custom-alert-${type}`;
        alertDiv.innerHTML = `
            <div class="alert-content">
                <i class="alert-icon"></i>
                <span class="alert-message">${message}</span>
                <button type="button" class="alert-close">&times;</button>
            </div>
        `;

        const mainContent = document.querySelector('.main-content');
        mainContent.insertBefore(alertDiv, mainContent.firstChild);

        const closeBtn = alertDiv.querySelector('.alert-close');
        closeBtn.addEventListener('click', () => {
            alertDiv.remove();
        });

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }


// --- 9. DATOS DE EJEMPLO ---
function initializeSampleComments() {
        const authToken = localStorage.getItem('authToken');
        if (authToken && authToken.startsWith('dev-token-')) {
            // Los comentarios se agregarán después de cargar las reseñas
            // para usar los IDs reales de las reseñas
            setTimeout(() => {
                // Obtener todas las reseñas renderizadas
                const reviewItems = document.querySelectorAll('.review-item');
                if (reviewItems.length > 0) {
                    const firstReviewId = reviewItems[0].getAttribute('data-review-id');
                    if (firstReviewId && !commentsData[firstReviewId]) {
                        const currentUserId = localStorage.getItem('userId');
                        commentsData[firstReviewId] = [
                            {
                                Id_Comment: 'dev-comment-1',
                                Text: '¡Excelente canción! Me encanta.',
                                Created: new Date(Date.now() - 3600000).toISOString(), // Hace 1 hora
                                ReviewId: firstReviewId,
                                IdUser: currentUserId || 'sample-user-1', // Tu comentario para poder editarlo
                                UserName: localStorage.getItem('username') || 'Usuario Demo',
                                Likes: 0, // 0 likes para poder editar
                                userLiked: false
                            },
                            {
                                Id_Comment: 'dev-comment-2',
                                Text: 'Totalmente de acuerdo, es una obra maestra.',
                                Created: new Date(Date.now() - 7200000).toISOString(), // Hace 2 horas
                                ReviewId: firstReviewId,
                                IdUser: 'sample-user-2', // Comentario de otro usuario
                                UserName: 'Maria456',
                                Likes: 2, // Tiene likes
                                userLiked: false
                            }
                        ];
                        
                        // Actualizar contador en el botón de comentarios
                        const commentBtn = document.querySelector(`.comment-btn[data-review-id="${firstReviewId}"]`);
                        if (commentBtn) {
                            const countSpan = commentBtn.querySelector('.review-comments-count');
                            if (countSpan) {
                                countSpan.textContent = commentsData[firstReviewId].length;
                            }
                        }
                    }
                }
            }, 2000); // Esperar a que se carguen las reseñas
        }
    }