// Home Page JavaScript

// Declarar variables globales al inicio para evitar errores de inicialización
let notificationConnection = null;
let notifications = []; // Array para almacenar notificaciones
let currentReviewFilter = 'popular'; // Filtro actual de reseñas: 'popular' o 'recent'
let loadReviews = null; // Función para cargar reseñas (se asignará en initializeReviews)
let userReviewsState = {}; // Estado anterior de las reseñas del usuario (para detectar cambios)
let notificationPollingInterval = null; // Intervalo de polling para notificaciones


const GATEWAY_BASE_URL = 'http://localhost:5000';
const CONTENT_API_URL = 'http://localhost:8001'; 
const SOCIAL_API_BASE_URL = 'http://localhost:8002';

// Función global para cambiar el filtro de reseñas
function setReviewFilter(filter) {
    currentReviewFilter = filter;
    // Actualizar botones activos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    // Recargar reseñas con el nuevo filtro
    if (typeof loadReviews === 'function') {
        loadReviews();
    }
}

/**
 * Función global para renderizar estrellas
 * Soporta estrellas completas, vacías y medias
 */
function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    // Estrellas completas
    for (let i = 0; i < fullStars; i++) {
        stars += '<span class="star full-star">★</span>';
    }
    
    // Media estrella
    if (hasHalfStar) {
        stars += '<span class="star half-star">★</span>';
    }
    
    // Estrellas vacías
    for (let i = 0; i < emptyStars; i++) {
        stars += '<span class="star empty-star">★</span>';
    }
    
    return stars;
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    if (document.getElementById('carouselWrapper')) {
        initializeCarousel();
    }
    if (document.getElementById('reviewsList')) {
        initializeReviews();
        //initializeCreateReviewModal(); 
        initializeSampleComments();
    }
    initializeSearch();
    initializeProfileDropdown();
    initializeNavigation();
    loadUserData();
    initializeLogoutModal();
    // Asegurar que la página se marque como completamente cargada
    window.addEventListener('load', function() {
        // Forzar que el navegador reconozca que la página terminó de cargar
        if (document.readyState === 'complete') {
            // La página está completamente cargada
            console.log('Página completamente cargada');
        }
    });
    
    // Timeout de seguridad: si después de 10 segundos aún no se cargó, forzar estado completo
    setTimeout(function() {
        if (document.readyState !== 'complete') {
            console.warn('Timeout de carga alcanzado, forzando estado completo');
        }
    }, 10000);

    // Carousel functionality
    function initializeCarousel() {
        const carouselWrapper = document.getElementById('carouselWrapper');
        const prevBtn = document.getElementById('carouselPrev');
        const nextBtn = document.getElementById('carouselNext');
        const indicatorsContainer = document.getElementById('carouselIndicators');

        // Lógica de cálculo para cada categoría
        // TODO: Conectar con el backend cuando esté disponible
        
        /**
         * LO MÁS RECOMENDADO
         * Lógica: Promedio de estrellas ponderado por cantidad de reseñas (mínimo 10 reseñas)
         * Cálculo: (suma de estrellas * cantidad de reseñas) / total de reseñas
         */
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

    // Search functionality
    function initializeSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchClear = document.getElementById('searchClear');
        const searchDropdown = document.getElementById('searchDropdown');
        
        let searchTimeout;
        let currentSearchController = null;

        // Show/hide clear button
        searchInput.addEventListener('input', function() {
            searchClear.style.display = this.value ? 'block' : 'none';
            
            // Cancelar búsqueda anterior si existe
            if (currentSearchController) {
                currentSearchController.abort();
            }
            
            // Limpiar timeout anterior
            clearTimeout(searchTimeout);
            
            if (this.value.length > 0) {
                // Debounce: esperar 500ms después de que el usuario deje de escribir
                searchTimeout = setTimeout(() => {
                    performSearch(this.value.trim());
                }, 500);
            } else {
                searchDropdown.style.display = 'none';
            }
        });

        searchClear.addEventListener('click', function() {
            searchInput.value = '';
            searchClear.style.display = 'none';
            searchDropdown.style.display = 'none';
            if (currentSearchController) {
                currentSearchController.abort();
            }
            clearTimeout(searchTimeout);
            searchInput.focus();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.style.display = 'none';
            }
        });

        async function performSearch(query) {
            if (!query || query.length === 0) {
                searchDropdown.style.display = 'none';
                return;
            }

            // Mostrar estado de carga
            searchDropdown.innerHTML = '<div class="search-loading">Buscando...</div>';
            searchDropdown.style.display = 'block';

            // Crear AbortController para cancelar la petición si es necesario
            currentSearchController = new AbortController();

            try {
                // URL del Gateway (puerto 5000) - ruta configurada en el gateway
                const GATEWAY_BASE_URL = 'http://localhost:5000';
                const response = await axios.get(`${GATEWAY_BASE_URL}/api/gateway/contents/search`, {
                    params: { query: query },
                    signal: currentSearchController.signal,
                    timeout: 5000
                });

                const results = response.data;
                displaySearchResults(results, query);
            } catch (error) {
                if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
                    // La búsqueda fue cancelada, no hacer nada
                    return;
                }
                
                console.error('Error en la búsqueda:', error);
                
                // Mostrar mensaje de error
                searchDropdown.innerHTML = `
                    <div class="search-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>Error al buscar. Intenta nuevamente.</span>
                    </div>
                `;
                searchDropdown.style.display = 'block';
            }
        }

        function displaySearchResults(results, query) {
            // Manejar tanto PascalCase (del backend .NET) como camelCase
            const artists = results.Artists || results.artists || [];
            const albums = results.Albums || results.albums || [];
            const songs = results.Songs || results.songs || [];

            // Si no hay resultados
            if (artists.length === 0 && albums.length === 0 && songs.length === 0) {
                searchDropdown.innerHTML = `
                    <div class="search-no-results">
                        <i class="fas fa-search"></i>
                        <span>No se encontraron resultados para "${query}"</span>
                    </div>
                `;
                searchDropdown.style.display = 'block';
                return;
            }

            let html = '';

            // Sección de Artistas
            if (artists.length > 0) {
                html += '<div class="search-section"><div class="search-section-title">Artistas</div>';
                artists.forEach(artist => {
                    // Manejar tanto PascalCase como camelCase
                    const artistId = artist.APIArtistId || artist.apiArtistId || '';
                    const artistName = artist.Name || artist.name || '';
                    const artistImage = artist.Imagen || artist.imagen || '../Assets/default-avatar.png';
                    
                    html += `
                        <div class="search-dropdown-item" data-type="artist" data-id="${artistId}">
                            <img src="${artistImage}" alt="${artistName}" class="search-item-image" onerror="this.src='../Assets/default-avatar.png'">
                            <span class="search-item-text">${artistName}</span>
                            <i class="fas fa-user search-item-icon"></i>
                        </div>
                    `;
                });
                html += '</div>';
            }

            // Sección de Álbumes
            if (albums.length > 0) {
                html += '<div class="search-section"><div class="search-section-title">Álbumes</div>';
                albums.forEach(album => {
                    // Manejar tanto PascalCase como camelCase
                    const albumId = album.APIAlbumId || album.apiAlbumId || '';
                    const albumTitle = album.Title || album.title || '';
                    const albumImage = album.Image || album.image || '../Assets/default-avatar.png';
                    
                    html += `
                        <div class="search-dropdown-item" data-type="album" data-id="${albumId}">
                            <img src="${albumImage}" alt="${albumTitle}" class="search-item-image" onerror="this.src='../Assets/default-avatar.png'">
                            <span class="search-item-text">${albumTitle}</span>
                            <i class="fas fa-compact-disc search-item-icon"></i>
                        </div>
                    `;
                });
                html += '</div>';
            }

            // Sección de Canciones
            if (songs.length > 0) {
                html += '<div class="search-section"><div class="search-section-title">Canciones</div>';
                songs.forEach(song => {
                    // Manejar tanto PascalCase como camelCase
                    const songId = song.APISongId || song.apiSongId || '';
                    const songTitle = song.Title || song.title || '';
                    const songImage = song.Image || song.image || '../Assets/default-avatar.png';
                    const artistName = song.ArtistName || song.artistName || '';
                    const artistNameDisplay = artistName ? ` - ${artistName}` : '';
                    
                    html += `
                        <div class="search-dropdown-item" data-type="song" data-id="${songId}">
                            <img src="${songImage}" alt="${songTitle}" class="search-item-image" onerror="this.src='../Assets/default-avatar.png'">
                            <span class="search-item-text">${songTitle}${artistNameDisplay}</span>
                            <i class="fas fa-music search-item-icon"></i>
                        </div>
                    `;
                });
                html += '</div>';
            }

            searchDropdown.innerHTML = html;
                searchDropdown.style.display = 'block';

            // Agregar event listeners a los items
            searchDropdown.querySelectorAll('.search-dropdown-item').forEach(item => {
                item.addEventListener('click', function() {
                    const type = this.getAttribute('data-type');
                    const id = this.getAttribute('data-id');
                    const text = this.querySelector('.search-item-text').textContent;
                    
                    // Cerrar dropdown
                    searchInput.value = text;
                searchDropdown.style.display = 'none';
                    
                    // Navegar a la vista correspondiente (en desarrollo)
                    navigateToContentView(type, id);
                });
            });
        }
    }

    // Función para navegar a las vistas de contenido (en desarrollo)
    function navigateToContentView(type, id) {
    if (!id || id.trim() === '' || id === '00000000-0000-0000-0000-000000000000') {
        console.error('Error: El ID del contenido está vacío o es inválido. No se puede navegar.');
         // (Si 'showAlert' está disponible en este scope, úsalo)
        // showAlert('Error: El ID del contenido es inválido.', 'danger');
        return;
        }
        let destinationUrl = '';
        switch(type) {
        case 'song':
        destinationUrl = `song.html?id=${id}`;
        break;
        case 'album':
        destinationUrl = `album.html?id=${id}`;
        break;
        case 'artist':
        destinationUrl = `artist.html?id=${id}`;
        break;
        default:
        console.warn('Tipo de contenido desconocido:', type);
        return;
        }

        console.log(`Navegando a: ${destinationUrl}`);
        window.location.href = destinationUrl;
    }
    // Profile dropdown functionality
    function initializeProfileDropdown() {
        const profileBtn = document.getElementById('profileBtn');
        const profileDropdown = document.getElementById('profileDropdown');
        const verPerfilBtn = document.getElementById('verPerfilBtn');
        const ajustesBtn = document.getElementById('ajustesBtn');
        const cerrarSesionBtn = document.getElementById('cerrarSesionBtn');

        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isVisible = profileDropdown.style.display === 'block';
            profileDropdown.style.display = isVisible ? 'none' : 'block';
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.style.display = 'none';
            }
        });

        // Profile actions
        verPerfilBtn.addEventListener('click', function() {
            profileDropdown.style.display = 'none';
         //   showAlert('Funcionalidad de ver perfil en desarrollo', 'info');
        //     // TODO: Navigate to profile page when ready
        });

        ajustesBtn.addEventListener('click', function() {
            profileDropdown.style.display = 'none';
            showAlert('Funcionalidad de ajustes en desarrollo', 'info');
            // TODO: Navigate to settings page when ready
        });

        cerrarSesionBtn.addEventListener('click', function() {
            profileDropdown.style.display = 'none';
            showLogoutModal();
        });
    }

    // Reviews functionality
    function initializeReviews() {
        const reviewsList = document.getElementById('reviewsList');

        // Sample reviews data (will be replaced with API calls)
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

        function renderReviews(reviews) {
            const currentUserId = localStorage.getItem('userId');
            const isLoggedIn = currentUserId !== null;
            
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
                
                // Verificar si es la reseña del usuario actual (comparación robusta como en comentarios)
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

            // Add event listeners for like buttons (con animaciones mejoradas y toggle)
            reviewsList.querySelectorAll('.btn-like').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Verificar si el usuario está logueado
                    const authToken = localStorage.getItem('authToken');
                    if (!authToken) {
                        showLoginRequiredModal();
                        return;
                    }
                    
                    const icon = this.querySelector('i');
                    const likesSpan = this.parentElement.querySelector('.review-likes-count');
                    const isLiked = this.classList.contains('liked');
                    const reviewId = this.getAttribute('data-review-id');

                    // Animación de like
                    this.style.transform = 'scale(1.2)';
                    setTimeout(() => {
                        this.style.transform = '';
                    }, 200);

                    if (isLiked) {
                        // Quitar like (optimistic update - actualizar UI primero)
                        this.classList.remove('liked');
                        icon.style.color = 'rgba(255,255,255,0.7)';
                        const currentLikes = parseInt(likesSpan.textContent);
                        likesSpan.textContent = Math.max(0, currentLikes - 1);
                        
                        // Guardar estado localmente (fallback si el backend falla)
                        const currentUserId = localStorage.getItem('userId');
                        if (currentUserId) {
                            localStorage.removeItem(`like_${reviewId}_${currentUserId}`);
                        }
                        
                        // Intentar guardar en el backend (no bloquea la UI)
                        deleteLikeFromBackend(reviewId).catch(err => {
                            console.warn('No se pudo eliminar like del backend, pero se mantiene el cambio local');
                        });
                    } else {
                        // Agregar like (optimistic update - actualizar UI primero)
                        this.classList.add('liked');
                        icon.style.color = 'var(--magenta, #EC4899)';
                        const currentLikes = parseInt(likesSpan.textContent) || 0;
                        const newLikes = currentLikes + 1;
                        likesSpan.textContent = newLikes;
                        console.log(`👍 Like optimista: ${currentLikes} -> ${newLikes}`);
                        
                        // Guardar estado localmente (fallback si el backend falla)
                        const currentUserId = localStorage.getItem('userId');
                        if (currentUserId) {
                            localStorage.setItem(`like_${reviewId}_${currentUserId}`, 'true');
                        }
                        
                        // Intentar guardar en el backend (no bloquea la UI)
                        sendLikeToBackend(reviewId).catch(err => {
                            console.warn('No se pudo guardar like en el backend, pero se mantiene el cambio local');
                        });
                    }
                });
            });

            // Add event listeners for edit buttons
            reviewsList.querySelectorAll('.btn-edit').forEach(btn => {
                btn.addEventListener('click', function() {
                    const reviewId = this.getAttribute('data-review-id');
                    const title = this.getAttribute('data-review-title') || '';
                    const content = this.getAttribute('data-review-content') || '';
                    const rating = parseInt(this.getAttribute('data-review-rating')) || 0;
                    
                    showEditReviewModal(reviewId, title, content, rating);
                });
            });
            
            // Add event listeners for delete buttons
            reviewsList.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation(); // Evitar que se abra la vista detallada
                    
                    // Obtener reviewId del botón o del contenedor padre
                    let reviewId = this.getAttribute('data-review-id');
                    console.log('🔍 [DEBUG] reviewId del botón:', reviewId);
                    
                    if (!reviewId || reviewId === 'null' || reviewId === 'undefined') {
                        // Fallback: obtener del contenedor padre
                        const reviewItem = this.closest('.review-item');
                        reviewId = reviewItem ? reviewItem.getAttribute('data-review-id') : null;
                        console.log('🔍 [DEBUG] reviewId del contenedor:', reviewId);
                    }
                    
                    // Normalizar reviewId
                    if (reviewId) {
                        reviewId = String(reviewId).trim();
                    }
                    
                    if (!reviewId || reviewId === '' || reviewId === 'null' || reviewId === 'undefined') {
                        console.error('❌ No se pudo obtener el reviewId para eliminar');
                        showAlert('Error: No se pudo identificar la reseña a eliminar', 'danger');
                        return;
                    }
                    
                    console.log('✅ [DEBUG] reviewId válido para eliminar:', reviewId);
                    
                    const reviewTitle = this.closest('.review-item')?.querySelector('.review-title')?.textContent || 'esta reseña';
                    
                    // Mostrar modal de confirmación
                    showDeleteReviewModal(reviewId, reviewTitle);
                });
            });
            
            // Botones de reportar reseñas
            reviewsList.querySelectorAll('.btn-report').forEach(btn => {
                btn.addEventListener('click', function() {
                    const reviewId = this.getAttribute('data-review-id');
                    reportReview(reviewId);
                });
            });
            
            // Add event listeners for comment buttons
            reviewsList.querySelectorAll('.comment-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation(); // Evitar que se abra la vista detallada
                    // Verificar si el usuario está logueado
                    const authToken = localStorage.getItem('authToken');
                    if (!authToken) {
                        showLoginRequiredModal();
                        return;
                    }
                    
                    const reviewId = this.getAttribute('data-review-id');
                    showCommentsModal(reviewId);
                });
            });
            
            // Hacer las reseñas clickeables para abrir vista detallada
            reviewsList.querySelectorAll('.review-clickable').forEach(element => {
                element.addEventListener('click', function(e) {
                    // No abrir si se hizo clic en un botón de acción
                    if (e.target.closest('.review-actions') || 
                        e.target.closest('.btn-edit') || 
                        e.target.closest('.btn-delete') || 
                        e.target.closest('.btn-report') ||
                        e.target.closest('.btn-like') ||
                        e.target.closest('.comment-btn')) {
                        return;
                    }
                    
                    const reviewId = this.getAttribute('data-review-id');
                    if (reviewId) {
                        showReviewDetailModal(reviewId);
                    }
                });
            });
        }


        /**
         * Cargar reseñas desde el Social Service (puerto 8002)
         */
        // Inicializar botones de filtro
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
            const GATEWAY_BASE_URL = 'http://localhost:5000';
            const currentUserId = localStorage.getItem('userId') ? localStorage.getItem('userId') : null;
            
            try {
                // 1. Obtener todas las reseñas a través del gateway (con timeout de 5 segundos)
                let reviews = [];
                try {
                    const reviewsResponse = await axios.get(`${GATEWAY_BASE_URL}/api/gateway/reviews`, {
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
                                    `${GATEWAY_BASE_URL}/api/review-details/${reviewId}`,
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
                                            `${GATEWAY_BASE_URL}/api/gateway/users/${userId}`,
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
                                    `${GATEWAY_BASE_URL}/api/gateway/reviews/${reviewId}/reactions/count`,
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
                                        `${GATEWAY_BASE_URL}/api/gateway/reviews/${reviewId}/comments`,
                                        { timeout: 3000 }
                                    );
                                    comments = Array.isArray(commentsResponse.data) ? commentsResponse.data.length : 0;
                                } catch (error) {
                                    // Si no hay ruta en gateway, intentar directo (fallback)
                                    try {
                                        const commentsResponse = await axios.get(
                                            `${GATEWAY_BASE_URL}/api/gateway/comments/review/${reviewId}`,
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
                                            `${GATEWAY_BASE_URL}/api/gateway/contents/song/${songIdStr}`,
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
                                        console.error(`❌ [DEBUG] URL intentada: ${GATEWAY_BASE_URL}/api/gateway/contents/song/${String(review.SongId).trim()}`);
                                        console.debug(`⚠️ No se pudo obtener canción desde Content Service:`, e.message);
                                    }
                                } else if (review.AlbumId) {
                                    try {
                                        const albumIdStr = String(review.AlbumId).trim();
                                        console.debug(`🔍 Obteniendo datos de álbum desde Content Service con ID: ${albumIdStr}`);
                                            const albumResponse = await axios.get(
                                            `${GATEWAY_BASE_URL}/api/gateway/contents/album/${albumIdStr}`,
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


        // Asignar la función loadReviews al scope global
        loadReviews = loadReviewsFunction;
        
        // Initialize reviews
        loadReviews();
        
        // Inicializar filtros de reseñas
        initializeReviewFilters();
    }

    // Navigation buttons
function initializeNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        const mobileNavButtons = document.querySelectorAll('.mobile-nav-btn');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const mobileNavMenu = document.getElementById('mobileNavMenu');

        // Desktop navigation
        navButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                handleNavigation(this, navButtons, mobileNavButtons);
            });
        });

        // Mobile navigation
        mobileNavButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                handleNavigation(this, navButtons, mobileNavButtons);
                // Close mobile menu after selection
                if (mobileNavMenu) {
                    mobileNavMenu.classList.remove('active');
                }
            });
        });

        // Mobile menu toggle
        if (mobileMenuToggle && mobileNavMenu) {
            mobileMenuToggle.addEventListener('click', function() {
                mobileNavMenu.classList.toggle('active');
                // Toggle icon
                const icon = this.querySelector('i');
                if (icon) {
                    if (mobileNavMenu.classList.contains('active')) {
                        icon.classList.remove('fa-bars');
                        icon.classList.add('fa-times');
                    } else {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                }
            });

            // Close mobile menu when clicking outside
            document.addEventListener('click', function(e) {
                if (!mobileMenuToggle.contains(e.target) && 
                    !mobileNavMenu.contains(e.target) && 
                    mobileNavMenu.classList.contains('active')) {
                    mobileNavMenu.classList.remove('active');
                    const icon = mobileMenuToggle.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                }
            });
        }

        function handleNavigation(clickedBtn, desktopBtns, mobileBtns) {
            // Remove active class from all buttons (desktop and mobile)
            desktopBtns.forEach(b => b.classList.remove('active'));
            mobileBtns.forEach(b => b.classList.remove('active'));
            
                // Add active class to clicked button
            clickedBtn.classList.add('active');
            
            // Sync active state between desktop and mobile
            const page = clickedBtn.getAttribute('data-page');
            desktopBtns.forEach(b => {
                if (b.getAttribute('data-page') === page) {
                    b.classList.add('active');
                }
            });
            mobileBtns.forEach(b => {
                if (b.getAttribute('data-page') === page) {
                    b.classList.add('active');
                }
            });
            
            // Force reflow to ensure CSS is applied
            void clickedBtn.offsetWidth;
                
                // --- ¡CAMBIO AQUÍ! ---
                // Se modificó el switch para la navegación
                switch(page) {
                    case 'inicio':
                        // Ya estamos en la página de inicio
                        // (Si estás en otra página, esto debería ser: window.location.href = 'home.html';)
                        break;
                    case 'rankings':
                        // Redirigimos a rankings.html
                        window.location.href = 'rankings.html';
                        break;
                    case 'amigos':
                        showAlert('Vista de Amigos en desarrollo', 'info');
                        // TODO: Navigate to friends page when ready
                        break;
                }
        }
    }

    // Load user data
    function loadUserData() {
        const authToken = localStorage.getItem('authToken');
        const username = localStorage.getItem('username');
        const usernameDisplay = document.getElementById('usernameDisplay');
        const loginContainer = document.getElementById('loginContainer');
        const profileContainer = document.getElementById('profileContainer');
        const notificationsContainer = document.getElementById('notificationsContainer');
        const addReviewContainer = document.getElementById('addReviewContainer');
        const loginBtn = document.getElementById('loginBtn');
        
        // Verificar si hay sesión activa
        if (!authToken) {
            // No hay sesión: mostrar botón de "Iniciar Sesion"
            if (loginContainer) loginContainer.style.display = 'flex';
            if (profileContainer) profileContainer.style.display = 'none';
            if (notificationsContainer) notificationsContainer.style.display = 'none';
            if (addReviewContainer) addReviewContainer.style.display = 'none';
            
            // Agregar evento al botón de login
            if (loginBtn) {
                loginBtn.addEventListener('click', function() {
            window.location.href = 'login.html';
                });
        }
        } else {
            // Hay sesión: mostrar dropdown de perfil y notificaciones
            if (loginContainer) loginContainer.style.display = 'none';
            if (profileContainer) profileContainer.style.display = 'block';
            if (notificationsContainer) notificationsContainer.style.display = 'block';
            if (addReviewContainer) addReviewContainer.style.display = 'block';
        
        // Si hay token pero no username, usar un valor por defecto
            if (username && usernameDisplay) {
            usernameDisplay.textContent = username;
            } else if (usernameDisplay) {
            usernameDisplay.textContent = 'Usuario';
        }
        
        // Cargar notificaciones existentes y conectar SignalR
        loadNotifications();
        
        // Iniciar polling de notificaciones (sistema frontend)
        startNotificationPolling();
        
        // Esperar a que SignalR esté disponible antes de inicializar
        if (typeof signalR !== 'undefined' && signalR) {
            initializeSignalR();
        } else {
            // Intentar de nuevo después de un breve delay
            setTimeout(() => {
                if (typeof signalR !== 'undefined' && signalR) {
                    initializeSignalR();
                } else {
                    console.warn('SignalR no está disponible después del delay. Las notificaciones en tiempo real no funcionarán.');
                }
            }, 500);
        }
        }
    }

    // Login Required Modal Functions
    function showLoginRequiredModal() {
        const modalOverlay = document.getElementById('loginRequiredModalOverlay');
        if (modalOverlay) {
            modalOverlay.style.display = 'flex';
        }
    }

    function hideLoginRequiredModal() {
        const modalOverlay = document.getElementById('loginRequiredModalOverlay');
        if (modalOverlay) {
            modalOverlay.style.display = 'none';
        }
    }

    // Event listeners para el modal de login requerido
    const goToLoginBtn = document.getElementById('goToLoginBtn');
    const cancelLoginRequiredBtn = document.getElementById('cancelLoginRequiredBtn');
    const loginRequiredModalOverlay = document.getElementById('loginRequiredModalOverlay');

    if (goToLoginBtn) {
        goToLoginBtn.addEventListener('click', function() {
            window.location.href = 'login.html';
        });
    }

    if (cancelLoginRequiredBtn) {
        cancelLoginRequiredBtn.addEventListener('click', function() {
            hideLoginRequiredModal();
        });
    }

    if (loginRequiredModalOverlay) {
        loginRequiredModalOverlay.addEventListener('click', function(e) {
            if (e.target === loginRequiredModalOverlay) {
                hideLoginRequiredModal();
            }
        });
    }

    // SignalR Connection for Notifications
    // notificationConnection ya está declarado al inicio del archivo
    
    function initializeSignalR() {
        // Verificar que signalR esté disponible
        if (typeof signalR === 'undefined' || !signalR) {
            console.warn('SignalR no está disponible. Las notificaciones en tiempo real no funcionarán.');
            return;
        }
        
        const authToken = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        
        if (!authToken || !userId) {
            return; // No conectar si no hay usuario logueado
        }

        // Si ya hay una conexión activa, no crear otra
        if (notificationConnection) {
            try {
                // Verificar el estado de la conexión existente
                if (notificationConnection.state) {
                    const state = notificationConnection.state;
                    if (state === signalR.HubConnectionState.Connected || state === signalR.HubConnectionState.Connecting) {
                        console.log('SignalR ya está conectado o conectando');
                        return;
                    }
                }
            } catch (e) {
                // Si hay error al verificar el estado, continuar y crear nueva conexión
                console.log('Creando nueva conexión SignalR (error verificando estado anterior)');
            }
        }

        const SOCIAL_API_BASE_URL = 'http://localhost:8002';
        const hubUrl = `${SOCIAL_API_BASE_URL}/notificationHub`;

        try {
            // Crear nueva conexión usando la variable global signalR
            const newConnection = new signalR.HubConnectionBuilder()
                .withUrl(hubUrl)
                .withAutomaticReconnect()
                .build();
            
            // Asignar después de crear para evitar problemas de referencia
            notificationConnection = newConnection;

            // Unirse al grupo del usuario
            notificationConnection.start()
                .then(() => {
                    console.log('SignalR Connected');
                    return notificationConnection.invoke('JoinUserGroup', userId);
                })
                .then(() => {
                    console.log('Joined user group:', userId);
                })
                .catch(err => {
                    // Silenciar errores de conexión cuando el servicio no está disponible
                    // Solo mostrar errores que no sean de conexión rechazada
                    const errorMessage = err?.message || String(err);
                    const isConnectionError = errorMessage.includes('Failed to fetch') || 
                                            errorMessage.includes('ERR_CONNECTION_REFUSED') ||
                                            errorMessage.includes('Failed to complete negotiation') ||
                                            errorMessage.includes('Failed to start the connection');
                    
                    if (!isConnectionError) {
                        console.error('Error connecting to SignalR:', err);
                    } else {
                        // Solo loguear en modo debug, no como error
                        console.debug('SignalR service no disponible. Las notificaciones en tiempo real no funcionarán.');
                    }
                });

            // Escuchar notificaciones
            notificationConnection.on('ReceiveNotification', function(notification) {
                console.log('Notification received:', notification);
                playNotificationSound();
                showNotificationAlert(notification);
            });

            // Manejar reconexión
            notificationConnection.onreconnecting(() => {
                console.log('SignalR reconnecting...');
            });

            notificationConnection.onreconnected(() => {
                console.log('SignalR reconnected');
                if (userId) {
                    notificationConnection.invoke('JoinUserGroup', userId);
                }
            });

        } catch (error) {
            // Silenciar errores de inicialización cuando SignalR no está disponible
            const errorMessage = error?.message || String(error);
            const isConnectionError = errorMessage.includes('Failed to fetch') || 
                                    errorMessage.includes('ERR_CONNECTION_REFUSED') ||
                                    errorMessage.includes('Failed to complete negotiation');
            
            if (!isConnectionError) {
                console.error('Error initializing SignalR:', error);
            } else {
                console.debug('SignalR no disponible. Las notificaciones en tiempo real no funcionarán.');
            }
        }
    }

    // Función para reproducir sonido de notificación
    function playNotificationSound() {
        try {
            // Crear un sonido simple usando Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800; // Frecuencia del sonido
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.warn('No se pudo reproducir el sonido de notificación:', error);
        }
    }

    // Función para mostrar alerta de notificación y agregarla al dropdown
    function showNotificationAlert(notification) {
        // Agregar notificación al dropdown
        addNotification({
            type: notification.Type || notification.type,
            date: notification.Date || notification.date || new Date().toISOString(),
            username: notification.Username || notification.username || 'Usuario',
            songName: notification.SongName || notification.songName || null,
            reviewId: notification.ReviewId || notification.reviewId || null
        });
        
        // Mostrar alerta temporal
        let message = 'Nueva notificación';
        
        if (notification.Type === 'NewReaction' || notification.type === 'NewReaction') {
            message = '¡Alguien le dio me gusta a tu reseña!';
        } else if (notification.Type === 'NewComment' || notification.type === 'NewComment') {
            message = '¡Alguien comentó tu reseña!';
        } else if (notification.Type === 'NewFollower' || notification.type === 'NewFollower') {
            message = '¡Nuevo seguidor!';
        }

        showAlert(message, 'info');
    }

    // Función para obtener la reacción existente del usuario
    async function getExistingReaction(reviewId) {
        const SOCIAL_API_BASE_URL = 'http://localhost:8002';
        const userId = localStorage.getItem('userId');
        const authToken = localStorage.getItem('authToken');

        if (!userId || !authToken) {
            return null;
        }

        try {
            // Intentar crear la reacción - si ya existe, el backend lanzará un error
            // Pero mejor: necesitamos un endpoint para obtener la reacción existente
            // Por ahora, guardamos el reactionId cuando se crea exitosamente
            const storedReactionId = localStorage.getItem(`reaction_${reviewId}_${userId}`);
            return storedReactionId;
        } catch (error) {
            return null;
        }
    }

    // Función para enviar like al backend
    async function sendLikeToBackend(reviewId) {
        const GATEWAY_BASE_URL = 'http://localhost:5000';
        const userId = localStorage.getItem('userId');
        const authToken = localStorage.getItem('authToken');

        if (!userId || !authToken) {
            return;
        }

        // TEMPORAL: Si es un token de desarrollo, simular la respuesta
        if (authToken.startsWith('dev-token-')) {
            // Simular respuesta exitosa para modo desarrollo
            const fakeReactionId = 'dev-reaction-' + Date.now();
            localStorage.setItem(`reaction_${reviewId}_${userId}`, fakeReactionId);
            console.log('Like simulado (modo desarrollo)');
            return;
        }

        try {
            // Intentar usar el gateway primero, si no existe, usar el Social Service directamente
            let response;
            try {
                response = await axios.post(`${GATEWAY_BASE_URL}/api/gateway/reviews/${reviewId}/reactions`, {
                    UserId: userId,
                    ReviewId: reviewId,
                    CommentId: null
                }, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                });
            } catch (gatewayError) {
                // Si el error es 404 o de conexión, usar el Social Service directamente
                // Pero si es 409 (Conflict), significa que ya existe y debemos manejarlo
                if (gatewayError.response && gatewayError.response.status === 404) {
                console.warn('Gateway no tiene ruta para reactions, usando Social Service directamente');
                const SOCIAL_API_BASE_URL = 'http://localhost:8002';
                response = await axios.post(`${SOCIAL_API_BASE_URL}/api/reactions`, {
                    UserId: userId,
                    ReviewId: reviewId,
                    CommentId: null
                }, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                });
                } else {
                    // Si es otro error (como 409), relanzarlo para que se maneje en el catch externo
                    throw gatewayError;
                }
            }
            
            // Guardar el reactionId para poder eliminarlo después
            // El backend puede devolver Id_Reaction, ReactionId, o id
            const reactionId = response.data?.Id_Reaction || response.data?.ReactionId || response.data?.id;
            if (reactionId) {
                localStorage.setItem(`reaction_${reviewId}_${userId}`, reactionId);
                console.log('✅ Like guardado exitosamente. ReactionId:', reactionId);
            }
            
            // Actualizar el contador de likes desde el backend sin recargar todas las reviews
            try {
                const likesResponse = await axios.get(
                    `${GATEWAY_BASE_URL}/api/gateway/reviews/${reviewId}/reactions/count`,
                    { timeout: 3000 }
                );
                const newLikeCount = likesResponse.data || 0;
                
                // Actualizar el contador en la UI (buscar de múltiples formas para asegurar que se encuentre)
                let likesSpan = document.querySelector(`.review-item[data-review-id="${reviewId}"] .review-likes-count`);
                if (!likesSpan) {
                    // Fallback: buscar por el botón de like
                    const likeBtn = document.querySelector(`.btn-like[data-review-id="${reviewId}"]`);
                    if (likeBtn && likeBtn.parentElement) {
                        likesSpan = likeBtn.parentElement.querySelector('.review-likes-count');
                    }
                }
                
                if (likesSpan) {
                    const oldCount = likesSpan.textContent;
                    likesSpan.textContent = newLikeCount;
                    console.log(`✅ Contador de likes actualizado desde backend (agregar): ${oldCount} -> ${newLikeCount}`);
                } else {
                    console.warn(`⚠️ No se encontró el elemento .review-likes-count para reviewId: ${reviewId}`);
                }
            } catch (likesError) {
                // Si no se puede obtener el contador, intentar desde el Social Service directamente
                try {
                    const likesResponse = await axios.get(
                        `http://localhost:8002/Reaction/${reviewId}/Reviews/count`,
                        { timeout: 3000 }
                    );
                    const newLikeCount = likesResponse.data || 0;
                    
                    // Actualizar el contador en la UI (buscar de múltiples formas para asegurar que se encuentre)
                    let likesSpan = document.querySelector(`.review-item[data-review-id="${reviewId}"] .review-likes-count`);
                    if (!likesSpan) {
                        // Fallback: buscar por el botón de like
                        const likeBtn = document.querySelector(`.btn-like[data-review-id="${reviewId}"]`);
                        if (likeBtn && likeBtn.parentElement) {
                            likesSpan = likeBtn.parentElement.querySelector('.review-likes-count');
                        }
                    }
                    
                    if (likesSpan) {
                        const oldCount = likesSpan.textContent;
                        likesSpan.textContent = newLikeCount;
                        console.log(`✅ Contador de likes actualizado desde backend (agregar, fallback): ${oldCount} -> ${newLikeCount}`);
                    } else {
                        console.warn(`⚠️ No se encontró el elemento .review-likes-count para reviewId: ${reviewId}`);
                    }
                } catch (e) {
                    console.debug('No se pudo actualizar el contador de likes, pero el like se guardó correctamente');
                }
            }
        } catch (error) {
            console.error('Error enviando like:', error);
            
            // Si el error es que ya existe la reacción (400 o 409), intentar eliminarla
            if (error.response && (error.response.status === 400 || error.response.status === 409)) {
                // Ya existe, entonces eliminarla usando reviewId y userId (no necesitamos reactionId)
                await deleteLikeFromBackend(reviewId, null);
            } else {
                // Revertir el like visualmente si falla
                const btn = document.querySelector(`.btn-like[data-review-id="${reviewId}"]`);
                if (btn) {
                    btn.classList.remove('liked');
                    const icon = btn.querySelector('i');
                    if (icon) icon.style.color = 'rgba(255,255,255,0.7)';
                    const likesSpan = btn.parentElement.querySelector('.review-likes-count');
                    if (likesSpan) {
                        const currentLikes = parseInt(likesSpan.textContent);
                        likesSpan.textContent = Math.max(0, currentLikes - 1);
                    }
                }
            }
        }
    }

    // Función para eliminar like del backend
    async function deleteLikeFromBackend(reviewId, reactionId = null) {
        const GATEWAY_BASE_URL = 'http://localhost:5000';
        const userId = localStorage.getItem('userId');
        const authToken = localStorage.getItem('authToken');

        if (!userId || !authToken) {
            return;
        }

        // Si no se proporciona reactionId, intentar obtenerlo del localStorage
        if (!reactionId) {
            reactionId = localStorage.getItem(`reaction_${reviewId}_${userId}`);
        }

        if (!reactionId) {
            console.warn('No se encontró reactionId para eliminar');
            return;
        }

        // TEMPORAL: Si es un token de desarrollo, simular la eliminación
        if (authToken.startsWith('dev-token-')) {
            // Simular eliminación exitosa para modo desarrollo
            localStorage.removeItem(`reaction_${reviewId}_${userId}`);
            
            console.log('Like eliminado (modo desarrollo)');
            return;
        }

        try {
            // El Social Service tiene: DELETE /api/reactions/review/{reviewId}/{userId}
            // Usamos esta ruta directamente ya que no necesitamos el reactionId
                const SOCIAL_API_BASE_URL = 'http://localhost:8002';
            await axios.delete(`${SOCIAL_API_BASE_URL}/api/reactions/review/${reviewId}/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                });
            
            // Eliminar el reactionId del localStorage
            localStorage.removeItem(`reaction_${reviewId}_${userId}`);
            console.log('✅ Like eliminado exitosamente');
            
            // Actualizar el estado visual del botón
            const btn = document.querySelector(`.btn-like[data-review-id="${reviewId}"]`);
            if (btn) {
                btn.classList.remove('liked');
                const icon = btn.querySelector('i');
                if (icon) icon.style.color = 'rgba(255,255,255,0.7)';
            }
            
            // Actualizar el contador de likes desde el backend sin recargar todas las reviews
            try {
                const likesResponse = await axios.get(
                    `${GATEWAY_BASE_URL}/api/gateway/reviews/${reviewId}/reactions/count`,
                    { timeout: 3000 }
                );
                const newLikeCount = likesResponse.data || 0;
                
                // Actualizar el contador en la UI (buscar de múltiples formas para asegurar que se encuentre)
                let likesSpan = document.querySelector(`.review-item[data-review-id="${reviewId}"] .review-likes-count`);
                if (!likesSpan) {
                    // Fallback: buscar por el botón de like
                    const likeBtn = document.querySelector(`.btn-like[data-review-id="${reviewId}"]`);
                    if (likeBtn && likeBtn.parentElement) {
                        likesSpan = likeBtn.parentElement.querySelector('.review-likes-count');
                    }
                }
                
                if (likesSpan) {
                    const oldCount = likesSpan.textContent;
                    likesSpan.textContent = newLikeCount;
                    console.log(`✅ Contador de likes actualizado desde backend (eliminar): ${oldCount} -> ${newLikeCount}`);
                } else {
                    console.warn(`⚠️ No se encontró el elemento .review-likes-count para reviewId: ${reviewId}`);
                }
            } catch (likesError) {
                // Si no se puede obtener el contador, intentar desde el Social Service directamente
                try {
                    const likesResponse = await axios.get(
                        `http://localhost:8002/Reaction/${reviewId}/Reviews/count`,
                        { timeout: 3000 }
                    );
                    const newLikeCount = likesResponse.data || 0;
                    
                    // Actualizar el contador en la UI (buscar de múltiples formas para asegurar que se encuentre)
                    let likesSpan = document.querySelector(`.review-item[data-review-id="${reviewId}"] .review-likes-count`);
                    if (!likesSpan) {
                        // Fallback: buscar por el botón de like
                        const likeBtn = document.querySelector(`.btn-like[data-review-id="${reviewId}"]`);
                        if (likeBtn && likeBtn.parentElement) {
                            likesSpan = likeBtn.parentElement.querySelector('.review-likes-count');
                        }
                    }
                    
                    if (likesSpan) {
                        const oldCount = likesSpan.textContent;
                        likesSpan.textContent = newLikeCount;
                        console.log(`✅ Contador de likes actualizado desde backend (eliminar, fallback): ${oldCount} -> ${newLikeCount}`);
                    } else {
                        console.warn(`⚠️ No se encontró el elemento .review-likes-count para reviewId: ${reviewId}`);
                    }
                } catch (e) {
                    console.debug('No se pudo actualizar el contador de likes, pero el like se eliminó correctamente');
                }
            }
        } catch (error) {
            console.error('Error eliminando like:', error);
            // Revertir visualmente si falla
            const btn = document.querySelector(`.btn-like[data-review-id="${reviewId}"]`);
            if (btn) {
                btn.classList.add('liked');
                const icon = btn.querySelector('i');
                if (icon) icon.style.color = 'var(--magenta, #EC4899)';
                const likesSpan = btn.parentElement.querySelector('.review-likes-count');
                if (likesSpan) {
                    const currentLikes = parseInt(likesSpan.textContent);
                    likesSpan.textContent = currentLikes + 1;
                }
            }
        }
    }

    // Array para almacenar comentarios simulados (key: reviewId, value: array de comentarios)
    let commentsData = {};
    
    // Función para obtener comentarios (simulados o del backend)
    async function getComments(reviewId) {
        const authToken = localStorage.getItem('authToken');
        
        // Si es modo desarrollo, usar comentarios simulados
        if (authToken && authToken.startsWith('dev-token-')) {
            return commentsData[reviewId] || [];
        }
        
        // Modo real: obtener del backend
        const GATEWAY_BASE_URL = 'http://localhost:5000';
        try {
            const commentsResponse = await axios.get(`${GATEWAY_BASE_URL}/api/gateway/comments/review/${reviewId}`);
            const comments = commentsResponse.data || [];
            
            console.log(`🔍 [DEBUG] Comentarios recibidos del backend:`, comments);
            
            // Poblar UserName desde el User Service para cada comentario que no lo tenga
            const currentUserId = localStorage.getItem('userId');
            const currentUsername = localStorage.getItem('username') || 'Usuario';
            
            const commentsWithUsers = await Promise.all(
                comments.map(async (comment) => {
                    console.log(`🔍 [DEBUG] Procesando comentario:`, comment);
                    
                    // Normalizar IdUser para comparaciones - buscar en múltiples campos posibles
                    const userIdFromComment = comment.IdUser || comment.idUser || comment.UserId || comment.userId || comment.Id_User || comment.id_user;
                    if (userIdFromComment) {
                        comment.IdUser = String(userIdFromComment).trim();
                        console.log(`✅ [DEBUG] IdUser encontrado en comentario: ${comment.IdUser}`);
                    } else {
                        console.warn(`⚠️ [DEBUG] Comentario sin IdUser. Campos disponibles:`, Object.keys(comment));
                    }
                    
                    // Verificar si tiene UserName válido (no vacío, no null, no undefined)
                    // Buscar en múltiples campos posibles
                    const existingUserName = comment.UserName || comment.username || comment.User_Name || comment.user_name;
                    const hasValidUserName = existingUserName && 
                                            existingUserName.trim() !== '' && 
                                            existingUserName !== 'Usuario' &&
                                            existingUserName !== 'null' &&
                                            existingUserName !== 'undefined';
                    
                    console.log(`🔍 [DEBUG] existingUserName: ${existingUserName}, hasValidUserName: ${hasValidUserName}`);
                    
                    // Si ya tiene UserName válido, verificar si es el usuario actual y usar el username del localStorage
                    if (hasValidUserName) {
                        // Si es el comentario del usuario actual, usar el username del localStorage (más confiable)
                        if (currentUserId && comment.IdUser) {
                            const normalizedCommentUserId = String(comment.IdUser).toLowerCase().trim();
                            const normalizedCurrentUserId = String(currentUserId).toLowerCase().trim();
                            if (normalizedCommentUserId === normalizedCurrentUserId) {
                                comment.UserName = currentUsername;
                                console.log(`✅ [DEBUG] Usando username del localStorage para comentario del usuario actual: ${currentUsername}`);
                            } else {
                                // Mantener el username existente si es válido
                                comment.UserName = existingUserName;
                            }
                        } else {
                            comment.UserName = existingUserName;
                        }
                        return comment;
                    }
                    
                    // Si no tiene UserName válido, obtenerlo desde el User Service
                    const userId = comment.IdUser;
                    if (userId) {
                        console.log(`🔍 [DEBUG] Obteniendo username para comentario con userId: ${userId}`);
                        try {
                            const userResponse = await axios.get(
                                `${GATEWAY_BASE_URL}/api/gateway/users/${userId}`,
                                { timeout: 2000 }
                            );
                            if (userResponse.data) {
                                const fetchedUsername = userResponse.data.Username || userResponse.data.username;
                                if (fetchedUsername && fetchedUsername.trim() !== '') {
                                    comment.UserName = fetchedUsername;
                                comment.UserProfilePicUrl = userResponse.data.imgProfile || userResponse.data.ImgProfile;
                                    console.log(`✅ [DEBUG] Username obtenido del User Service: ${fetchedUsername}`);
                                } else {
                                    // Si el User Service no devuelve username, usar el del localStorage si es el usuario actual
                                    if (currentUserId) {
                                        const normalizedCommentUserId = String(userId).toLowerCase().trim();
                                        const normalizedCurrentUserId = String(currentUserId).toLowerCase().trim();
                                        if (normalizedCommentUserId === normalizedCurrentUserId) {
                                            comment.UserName = currentUsername;
                                            console.log(`✅ [DEBUG] Usando username del localStorage (User Service sin username): ${currentUsername}`);
                                        } else {
                                            comment.UserName = 'Usuario';
                                        }
                                    } else {
                                        comment.UserName = 'Usuario';
                                    }
                                }
                            } else {
                                // Si el User Service no devuelve datos, usar el del localStorage si es el usuario actual
                                if (currentUserId) {
                                    const normalizedCommentUserId = String(userId).toLowerCase().trim();
                                    const normalizedCurrentUserId = String(currentUserId).toLowerCase().trim();
                                    if (normalizedCommentUserId === normalizedCurrentUserId) {
                                        comment.UserName = currentUsername;
                                        console.log(`✅ [DEBUG] Usando username del localStorage (User Service sin datos): ${currentUsername}`);
                                    } else {
                                        comment.UserName = 'Usuario';
                                    }
                                } else {
                                    comment.UserName = 'Usuario';
                                }
                            }
                        } catch (userError) {
                            console.error(`❌ [DEBUG] Error obteniendo usuario ${userId} del User Service para comentario:`, userError);
                            // Si no se puede obtener, usar el username del localStorage si es el usuario actual
                            if (currentUserId) {
                                const normalizedCommentUserId = String(userId).toLowerCase().trim();
                                const normalizedCurrentUserId = String(currentUserId).toLowerCase().trim();
                                if (normalizedCommentUserId === normalizedCurrentUserId) {
                                    comment.UserName = currentUsername;
                                    console.log(`✅ [DEBUG] Usando username del localStorage (error en User Service): ${currentUsername}`);
                                } else {
                                    comment.UserName = 'Usuario';
                                    console.log(`⚠️ [DEBUG] No se pudo obtener username, usando 'Usuario' por defecto`);
                                }
                            } else {
                                comment.UserName = 'Usuario';
                            }
                        }
                    } else {
                        // Si no hay userId, usar 'Usuario' por defecto
                        comment.UserName = 'Usuario';
                        console.log(`⚠️ [DEBUG] Comentario sin userId, usando 'Usuario' por defecto`);
                    }
                    
                    return comment;
                })
            );
            
            return commentsWithUsers;
        } catch (error) {
            console.error('Error obteniendo comentarios:', error);
            return [];
        }
    }
    
    // Función para agregar comentario (simulado o al backend)
    async function addCommentToBackend(reviewId, commentText) {
        const authToken = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        const username = localStorage.getItem('username') || 'Usuario';
        
        if (!authToken || !userId) {
            return null;
        }
        
        // Si es modo desarrollo, simular
        if (authToken.startsWith('dev-token-')) {
            if (!commentsData[reviewId]) {
                commentsData[reviewId] = [];
            }
            
            const newComment = {
                Id_Comment: 'dev-comment-' + Date.now(),
                Text: commentText,
                Created: new Date().toISOString(),
                Updated: new Date().toISOString(),
                ReviewId: reviewId,
                IdUser: userId,
                UserName: username,
                Likes: 0,
                userLiked: false
            };
            
            commentsData[reviewId].push(newComment);
            console.log('Comentario simulado agregado:', newComment);
            return newComment;
        }
        
        // Modo real: enviar al backend a través del gateway
        const GATEWAY_BASE_URL = 'http://localhost:5000';
        try {
            const response = await axios.post(`${GATEWAY_BASE_URL}/api/gateway/comments`, {
                ReviewId: reviewId,
                Text: commentText,
                IdUser: userId
            }, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Agregar UserName y normalizar IdUser desde localStorage ya que el backend no lo devuelve
            const commentData = response.data;
            if (commentData) {
                // Normalizar IdUser para asegurar consistencia
                if (commentData.IdUser || commentData.idUser) {
                    commentData.IdUser = String(commentData.IdUser || commentData.idUser).trim();
                } else if (userId) {
                    // Si el backend no devolvió IdUser, usar el que enviamos
                    commentData.IdUser = String(userId).trim();
                }
                
                // Agregar UserName si no está presente
                if (!commentData.UserName && !commentData.username) {
                    commentData.UserName = username;
                }
                
                console.log('✅ Comentario creado con datos:', {
                    IdUser: commentData.IdUser,
                    UserName: commentData.UserName,
                    Id_Comment: commentData.Id_Comment || commentData.id_Comment
                });
            }
            
            return commentData;
        } catch (error) {
            console.error('Error agregando comentario:', error);
            throw error;
        }
    }
    
    // Variable para almacenar el reviewId que se está eliminando
    let deletingReviewId = null;
    
    // Función para mostrar modal de eliminación de reseña
    function showDeleteReviewModal(reviewId, reviewTitle) {
        // Validar y normalizar reviewId
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
        
        console.log('✅ [DEBUG] Guardando reviewId para eliminar:', reviewId);
        deletingReviewId = reviewId;
        
        const modal = document.getElementById('deleteReviewModalOverlay');
        const messageElement = document.getElementById('deleteReviewMessage');
        
        if (modal && messageElement) {
            // Personalizar el mensaje con el título de la reseña
            messageElement.textContent = `¿Estás seguro de que quieres eliminar la reseña "${reviewTitle}"? Esta acción no se puede deshacer.`;
            modal.style.display = 'flex';
        } else {
            console.error('❌ Modal de eliminación de reseña no encontrado');
        }
    }
    
    // Función para cerrar modal de eliminación de reseña
    function hideDeleteReviewModal() {
        const modal = document.getElementById('deleteReviewModalOverlay');
        if (modal) {
            modal.style.display = 'none';
        }
        deletingReviewId = null;
    }
    
    // Función para confirmar eliminación de reseña
    async function confirmDeleteReview() {
        if (!deletingReviewId) {
            console.error('No hay reviewId para eliminar');
            showAlert('Error: No se pudo identificar la reseña a eliminar', 'danger');
            return;
        }
        
        // Guardar el reviewId antes de cerrar el modal (que limpia la variable)
        const reviewIdToDelete = deletingReviewId;
        
        // Cerrar modal
        hideDeleteReviewModal();
        
        // Llamar a la función de eliminación con el reviewId guardado
        await deleteReview(reviewIdToDelete);
    }
    
    // Función para eliminar reseña
    async function deleteReview(reviewId) {
        // Validar que reviewId no sea null o undefined
        if (!reviewId || reviewId === 'null' || reviewId === 'undefined') {
            console.error('ReviewId inválido en deleteReview:', reviewId);
            showAlert('Error: No se pudo identificar la reseña a eliminar', 'danger');
            return;
        }
        
        const GATEWAY_BASE_URL = 'http://localhost:5000';
        const userId = localStorage.getItem('userId');
        const authToken = localStorage.getItem('authToken');
        
        if (!userId || !authToken) {
            showAlert('Debes iniciar sesión para eliminar reseñas', 'warning');
            return;
        }
        
        console.log('🗑️ Eliminando reseña:', { reviewId, userId });
        
        try {
            // El backend tiene: [HttpDelete("reviews/{id}/{Userid}")] con [FromQuery]Guid id, [FromQuery] Guid Userid
            // Esto es confuso: la ruta tiene {id} y {Userid} pero los parámetros son [FromQuery]
            // El gateway tiene configurado: DELETE /api/gateway/reviews/{id}/{userId}
            // Intentar primero con el gateway
            try {
                // Intentar con el gateway usando la ruta configurada
                const gatewayUrl = `${GATEWAY_BASE_URL}/api/gateway/reviews/${reviewId}/${userId}`;
                console.log('🔍 [DEBUG] Intentando eliminar con gateway:', gatewayUrl);
                await axios.delete(gatewayUrl, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                });
                console.log('✅ [DEBUG] Eliminación exitosa con gateway');
            } catch (gatewayError) {
                // Si el gateway falla, usar el Social Service directamente
                console.warn('⚠️ Gateway falló, usando Social Service directamente:', gatewayError.response?.status, gatewayError.response?.statusText);
                const SOCIAL_API_BASE_URL = 'http://localhost:8002';
                
                // El controller tiene [FromQuery] aunque la ruta tenga {id} y {Userid}
                // Intentar diferentes formatos
                let socialUrl;
                let lastError;
                
                // Opción 1: Ruta con parámetros en path + query parameters
                try {
                    socialUrl = `${SOCIAL_API_BASE_URL}/api/reviews/${reviewId}/${userId}?id=${reviewId}&Userid=${userId}`;
                    console.log('🔍 [DEBUG] Intentando eliminar con Social Service (opción 1):', socialUrl);
                    await axios.delete(socialUrl, {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 5000
                    });
                    console.log('✅ [DEBUG] Eliminación exitosa con Social Service (opción 1)');
                } catch (error1) {
                    lastError = error1;
                    console.warn('⚠️ Opción 1 falló, intentando opción 2');
                    
                    // Opción 2: Solo query parameters sin path parameters
                    try {
                        socialUrl = `${SOCIAL_API_BASE_URL}/api/reviews?id=${reviewId}&Userid=${userId}`;
                        console.log('🔍 [DEBUG] Intentando eliminar con Social Service (opción 2):', socialUrl);
                        await axios.delete(socialUrl, {
                            headers: {
                                'Authorization': `Bearer ${authToken}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 5000
                        });
                        console.log('✅ [DEBUG] Eliminación exitosa con Social Service (opción 2)');
                    } catch (error2) {
                        lastError = error2;
                        console.warn('⚠️ Opción 2 falló, intentando opción 3');
                        
                        // Opción 3: Solo path parameters (sin query)
                        socialUrl = `${SOCIAL_API_BASE_URL}/api/reviews/${reviewId}/${userId}`;
                        console.log('🔍 [DEBUG] Intentando eliminar con Social Service (opción 3):', socialUrl);
                        await axios.delete(socialUrl, {
                            headers: {
                                'Authorization': `Bearer ${authToken}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 5000
                        });
                        console.log('✅ [DEBUG] Eliminación exitosa con Social Service (opción 3)');
                    }
                }
            }
            
            showAlert('✅ Reseña eliminada exitosamente', 'success');
            
            // Recargar reseñas
            if (typeof loadReviews === 'function') {
                await loadReviews();
            }
        } catch (error) {
            console.error('Error eliminando reseña:', error);
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || error.response.data?.Message || 'Error desconocido';
                
                if (status === 409) {
                    showAlert('No se puede eliminar la reseña porque tiene likes. Primero debes eliminar los likes.', 'warning');
                } else if (status === 404) {
                    showAlert('La reseña no fue encontrada.', 'danger');
                } else if (status === 401) {
                    showAlert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'warning');
                    setTimeout(() => {
                        window.location.href = 'login.html';
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
    
    // Función para mostrar modal de editar reseña
    async function showEditReviewModal(reviewId, title, content, rating) {
        const modal = document.getElementById('createReviewModalOverlay');
        if (!modal) {
            console.error('Modal de crear reseña no encontrado');
            return;
        }
        
        // Guardar reviewId en el modal para saber que es edición
        modal.setAttribute('data-edit-review-id', reviewId);
        
        // Cargar los datos del contenido desde localStorage
        const normalizedReviewId = String(reviewId).trim();
        const storageKey = `review_content_${normalizedReviewId}`;
        const storedContentData = localStorage.getItem(storageKey);
        
        console.log(`🔍 Cargando datos del contenido para edición (reviewId: ${reviewId})`);
        
        if (storedContentData) {
            try {
                const contentData = JSON.parse(storedContentData);
                console.log('📦 Datos del contenido encontrados:', contentData);
                
                // Establecer currentReviewData con los datos del contenido
                currentReviewData = {
                    type: contentData.type,
                    id: contentData.id,
                    name: contentData.name || '',
                    artist: contentData.artist || '',
                    image: contentData.image || '../Assets/default-avatar.png'
                };
                
                // Mostrar la información del contenido en el modal
                const contentInfoImage = document.getElementById('contentInfoImage');
                const contentInfoName = document.getElementById('contentInfoName');
                const contentInfoType = document.getElementById('contentInfoType');
                
                if (contentInfoImage) {
                    contentInfoImage.src = currentReviewData.image;
                    contentInfoImage.onerror = function() {
                        this.src = '../Assets/default-avatar.png';
                    };
                }
                
                if (contentInfoName) {
                    contentInfoName.textContent = currentReviewData.name;
                }
                
                if (contentInfoType) {
                    contentInfoType.textContent = currentReviewData.type === 'song' ? 'CANCIÓN' : 'ÁLBUM';
                }
                
                console.log('✅ currentReviewData establecido para edición:', currentReviewData);
            } catch (e) {
                console.error('❌ Error parseando datos del contenido guardados:', e);
                // Si no se pueden cargar los datos, mostrar un mensaje
                showAlert('No se pudieron cargar los datos del contenido. La reseña se puede editar pero no se mostrará la información del contenido.', 'warning');
            }
        } else {
            console.warn(`⚠️ No se encontraron datos del contenido en localStorage para review ${reviewId}`);
            // Intentar obtener desde el backend si no están en localStorage
            try {
                const GATEWAY_BASE_URL = 'http://localhost:5000';
                const reviewResponse = await axios.get(`${GATEWAY_BASE_URL}/api/gateway/reviews/${reviewId}`, {
                    timeout: 3000
                });
                
                if (reviewResponse.data) {
                    const review = reviewResponse.data;
                    // Si tenemos SongId o AlbumId, intentar obtener los datos desde el Content Service
                    // Pero como no tenemos APISongId/APIAlbumId, solo podemos mostrar un mensaje genérico
                    console.log('📦 Datos de la reseña obtenidos del backend:', review);
                }
            } catch (e) {
                console.debug('No se pudieron obtener datos del backend:', e);
            }
            
            showAlert('No se encontraron los datos del contenido. La reseña se puede editar pero no se mostrará la información del contenido.', 'warning');
        }
        
        // Llenar los campos con los datos actuales
        const titleInput = document.getElementById('createReviewTitleInput');
        const textInput = document.getElementById('createReviewTextInput');
        const starsContainer = document.getElementById('createReviewStars');
        
        if (titleInput) titleInput.value = title;
        if (textInput) textInput.value = content;
        
        // Establecer las estrellas
        if (starsContainer) {
            const stars = starsContainer.querySelectorAll('.star-input');
            stars.forEach((star) => {
                const starRating = parseInt(star.getAttribute('data-rating'));
                if (starRating <= rating) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            });
        }
        
        // Cambiar el título del modal
        const modalTitle = modal.querySelector('.create-review-title');
        if (modalTitle) {
            modalTitle.textContent = 'Editar Reseña';
        }
        
        // Ocultar el selector de contenido ya que no se puede cambiar
        const contentSelector = document.getElementById('createReviewContentSelector');
        const contentInfo = document.getElementById('createReviewContentInfo');
        if (contentSelector) contentSelector.style.display = 'none';
        if (contentInfo) contentInfo.style.display = 'block';
        
        // Mostrar modal
        modal.style.display = 'flex';
    }
    
    // Función para mostrar vista detallada de reseña (estilo Twitter/X)
    async function showReviewDetailModal(reviewId) {
        const modal = document.getElementById('reviewDetailModalOverlay');
        if (!modal) {
            console.error('Modal de vista detallada no encontrado');
            return;
        }
        
        // Mostrar modal
        modal.style.display = 'flex';
        
        // Mostrar loading
        const contentDiv = document.getElementById('reviewDetailContent');
        if (contentDiv) {
            contentDiv.innerHTML = '<div style="padding: 2rem; text-align: center; color: rgba(255,255,255,0.7);">Cargando reseña...</div>';
        }
        
        try {
            // Obtener detalles completos de la reseña
            const GATEWAY_BASE_URL = 'http://localhost:5000';
            const reviewResponse = await axios.get(`${GATEWAY_BASE_URL}/api/review-details/${reviewId}`, { timeout: 5000 });
            const reviewData = reviewResponse.data;
            
            // Obtener reseña básica también para tener todos los datos
            const reviewsResponse = await axios.get(`${GATEWAY_BASE_URL}/api/gateway/reviews`, { timeout: 5000 });
            const allReviews = reviewsResponse.data || [];
            const review = allReviews.find(r => {
                const rId = r.ReviewId || r.reviewId || r.id || r.Id_Review || r.id_Review;
                return rId && String(rId).trim() === String(reviewId).trim();
            });
            
            if (!review && !reviewData) {
                throw new Error('Reseña no encontrada');
            }
            
            // Combinar datos de review y reviewData
            const fullReview = {
                ...review,
                ...reviewData?.review,
                user: reviewData?.user || {},
                song: reviewData?.song || {},
                album: reviewData?.album || {}
            };
            
            // Obtener datos de contenido desde localStorage
            const normalizedReviewId = String(reviewId).trim();
            const storageKey = `review_content_${normalizedReviewId}`;
            const storedContentData = localStorage.getItem(storageKey);
            let contentData = null;
            if (storedContentData) {
                try {
                    contentData = JSON.parse(storedContentData);
                } catch (e) {
                    console.error('Error parseando datos de contenido:', e);
                }
            }
            
            // Determinar nombre y artista
            let songName = 'Canción';
            let albumName = 'Álbum';
            let artistName = 'Artista';
            let contentType = 'song';
            
            if (contentData) {
                contentType = contentData.type || 'song';
                if (contentData.type === 'song') {
                    songName = contentData.name || songName;
                    artistName = contentData.artist || artistName;
                } else {
                    albumName = contentData.name || albumName;
                    artistName = contentData.artist || artistName;
                }
            } else if (fullReview.song) {
                songName = fullReview.song.Title || fullReview.song.title || songName;
                artistName = fullReview.song.ArtistName || fullReview.song.artistName || artistName;
            } else if (fullReview.album) {
                albumName = fullReview.album.Title || fullReview.album.title || albumName;
            }
            
            // Obtener username y avatar
            const username = fullReview.user?.username || fullReview.user?.Username || 'Usuario';
            const avatar = fullReview.user?.imgProfile || fullReview.user?.ImgProfile || '../Assets/default-avatar.png';
            
            // Obtener likes y comentarios
            let likes = 0;
            try {
                const likesResponse = await axios.get(`${GATEWAY_BASE_URL}/api/gateway/reviews/${reviewId}/reactions/count`, { timeout: 3000 });
                likes = likesResponse.data || 0;
            } catch (e) {
                console.debug('No se pudieron obtener likes');
            }
            
            let comments = [];
            try {
                comments = await getComments(reviewId);
            } catch (e) {
                console.debug('No se pudieron obtener comentarios');
            }
            
            // Renderizar reseña completa
            const reviewTitle = fullReview.Title || fullReview.title || '';
            const reviewContent = fullReview.Content || fullReview.content || '';
            const reviewRating = fullReview.Rating || fullReview.rating || 0;
            const createdAt = fullReview.CreatedAt || fullReview.Created || new Date();
            const timeAgo = formatNotificationTime(createdAt);
            
            const currentUserId = localStorage.getItem('userId');
            const reviewUserId = fullReview.UserId || fullReview.userId || '';
            const isOwnReview = currentUserId && (reviewUserId === currentUserId || reviewUserId.toString() === currentUserId.toString());
            
            // Verificar si el usuario dio like
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
                            <img src="${avatar}" alt="${username}" class="review-detail-avatar" onerror="this.src='../Assets/default-avatar.png'">
                            <div class="review-detail-user-info">
                                <span class="review-detail-username">${username}</span>
                                <span class="review-detail-time">${timeAgo}</span>
                            </div>
                        </div>
                        <div class="review-detail-meta">
                            <span class="review-detail-content-type">${contentType === 'song' ? 'Canción' : 'Álbum'}</span>
                            <span class="review-detail-separator">•</span>
                            <span class="review-detail-content-name">${contentName}</span>
                            <span class="review-detail-separator">•</span>
                            <span class="review-detail-artist">${artistName}</span>
                        </div>
                        ${reviewTitle ? `<h2 class="review-detail-title">${reviewTitle}</h2>` : ''}
                        <p class="review-detail-text">${reviewContent}</p>
                        <div class="review-detail-rating">
                            <div class="review-detail-stars">
                                ${renderStars(reviewRating)}
                            </div>
                        </div>
                        <div class="review-detail-interactions">
                            <button class="review-detail-interaction-btn ${userLiked ? 'liked' : ''}" 
                                    data-review-id="${reviewId}"
                                    id="reviewDetailLikeBtn">
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
            
            // Cargar comentarios
            await loadReviewDetailComments(reviewId);
            
            // Agregar event listeners
            const likeBtn = document.getElementById('reviewDetailLikeBtn');
            if (likeBtn) {
                likeBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const authToken = localStorage.getItem('authToken');
                    if (!authToken) {
                        showLoginRequiredModal();
                        return;
                    }
                    toggleReviewLikeInDetail(reviewId, this);
                });
            }
            
            // Actualizar avatar del input
            const inputAvatar = document.getElementById('reviewDetailInputAvatar');
            if (inputAvatar) {
                const currentUserAvatar = localStorage.getItem('userAvatar') || '../Assets/default-avatar.png';
                inputAvatar.src = currentUserAvatar;
            }
            
        } catch (error) {
            console.error('Error cargando vista detallada:', error);
            if (contentDiv) {
                contentDiv.innerHTML = '<div style="padding: 2rem; text-align: center; color: rgba(255,255,255,0.7);">Error al cargar la reseña</div>';
            }
        }
    }
    
    // Función para cargar comentarios en la vista detallada
    async function loadReviewDetailComments(reviewId) {
        const commentsList = document.getElementById('reviewDetailCommentsList');
        const commentsCount = document.getElementById('reviewDetailCommentsCount');
        
        if (!commentsList) return;
        
        try {
            const comments = await getComments(reviewId);
            
            // Actualizar contador
            if (commentsCount) {
                commentsCount.textContent = comments.length;
            }
            
            // Renderizar comentarios
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
                                <div class="review-detail-comment-header">
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
                }).join('');
                
                // Agregar event listeners
                attachReviewDetailCommentListeners(reviewId);
            }
        } catch (error) {
            console.error('Error cargando comentarios en vista detallada:', error);
            commentsList.innerHTML = '<div class="review-detail-comment-empty">Error al cargar comentarios</div>';
        }
    }
    
    // Función para agregar event listeners a comentarios en vista detallada
    function attachReviewDetailCommentListeners(reviewId) {
        // Botones de like
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
    
    // Función para toggle like en comentario de vista detallada
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
    
    // Función para editar comentario en vista detallada
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
    
    // Función para cancelar edición inline en vista detallada
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
    
    // Función para confirmar edición inline en vista detallada
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
            await updateCommentInData(reviewId, commentId, newText);
        
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
    
    // Función para eliminar comentario en vista detallada
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
    
    // Función para toggle like en vista detallada
    async function toggleReviewLikeInDetail(reviewId, btn) {
        const icon = btn.querySelector('i');
        const likesSpan = btn.querySelector('.review-detail-likes-count');
        const isLiked = btn.classList.contains('liked');
        
        if (isLiked) {
            btn.classList.remove('liked');
            icon.style.color = 'rgba(255,255,255,0.7)';
            const currentLikes = parseInt(likesSpan.textContent) || 0;
            likesSpan.textContent = Math.max(0, currentLikes - 1);
            await deleteLikeFromBackend(reviewId);
        } else {
            btn.classList.add('liked');
            icon.style.color = 'var(--magenta, #EC4899)';
            const currentLikes = parseInt(likesSpan.textContent) || 0;
            likesSpan.textContent = currentLikes + 1;
            await sendLikeToBackend(reviewId);
        }
    }
    
    // Función para cerrar modal de vista detallada
    function hideReviewDetailModal() {
        const modal = document.getElementById('reviewDetailModalOverlay');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    // Función para mostrar modal de comentarios
    async function showCommentsModal(reviewId) {
        const modal = document.getElementById('commentsModalOverlay');
        if (!modal) {
            console.error('Modal de comentarios no encontrado');
            return;
        }
        
        // Guardar reviewId en el modal
        modal.setAttribute('data-review-id', reviewId);
        
        // Mostrar modal
        modal.style.display = 'flex';
        
        // Cargar comentarios
        await loadCommentsIntoModal(reviewId);
    }
    
    // Función para cargar comentarios en el modal
    async function loadCommentsIntoModal(reviewId) {
        const commentsList = document.getElementById('commentsList');
        const commentsCount = document.getElementById('commentsCount');
        
        if (!commentsList) return;
        
        const comments = await getComments(reviewId);
        
        // Actualizar contador
        if (commentsCount) {
            commentsCount.textContent = comments.length;
        }
        
        // Renderizar comentarios
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
                const date = new Date(comment.Created || comment.Created || comment.date);
                const timeAgo = formatNotificationTime(comment.Created || comment.Created || comment.date);
                const username = comment.UserName || comment.username || 'Usuario';
                const text = comment.Text || comment.text || '';
                // Buscar commentId en múltiples campos posibles y normalizar a string
                let commentId = comment.Id_Comment || comment.id_Comment || comment.IdComment || comment.idComment || comment.id || comment.Id || '';
                if (commentId) {
                    commentId = String(commentId).trim();
                }
                const commentUserId = comment.IdUser || comment.idUser || comment.Id_User || comment.id_user || comment.userId || '';
                const likes = comment.Likes || comment.likes || 0;
                const userLiked = comment.userLiked || false;
                
                console.log('🔍 [DEBUG] Renderizando comentario:', {
                    commentId,
                    commentIdType: typeof commentId,
                    commentIdLength: commentId ? commentId.length : 0,
                    commentUserId,
                    username,
                    text: text.substring(0, 20) + '...',
                    allKeys: Object.keys(comment),
                    rawId_Comment: comment.id_Comment,
                    rawId_CommentType: typeof comment.id_Comment
                });
                
                // Validar que commentId no esté vacío
                if (!commentId || commentId === '' || commentId === 'null' || commentId === 'undefined') {
                    console.error('❌ [DEBUG] commentId inválido o vacío para comentario:', comment);
                    // Intentar usar un ID temporal basado en el índice si no hay ID válido
                    commentId = `temp-comment-${Date.now()}-${Math.random()}`;
                    console.warn('⚠️ [DEBUG] Usando ID temporal:', commentId);
                }
                
                // Verificar si es el comentario del usuario actual (comparación robusta)
                // Normalizar ambos IDs a string (sin toLowerCase para preservar formato GUID)
                const normalizedCommentUserId = commentUserId ? String(commentUserId).trim() : '';
                const normalizedCurrentUserId = currentUserId ? String(currentUserId).trim() : '';
                
                // Comparar de forma case-insensitive pero preservando el formato original
                const isOwnComment = normalizedCurrentUserId && normalizedCommentUserId && 
                    normalizedCommentUserId.toLowerCase() === normalizedCurrentUserId.toLowerCase();
                
                console.debug('🔍 Comparación de userId:', {
                    commentUserId: normalizedCommentUserId,
                    currentUserId: normalizedCurrentUserId,
                    isOwnComment: isOwnComment
                });
                
                // Si es tu comentario: mostrar editar y eliminar
                // Si es de otro usuario: mostrar reportar
                let actionButtons = '';
                if (isOwnComment) {
                    // Es mi comentario: mostrar editar y eliminar
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
                    // Es de otro usuario: solo reportar
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
                                        title="Me gusta">
                                    <i class="fa-solid fa-heart" style="color: ${userLiked ? 'var(--magenta, #EC4899)' : 'rgba(255,255,255,0.6)'};"></i>
                                    <span class="comment-likes-count">${likes}</span>
                                </button>
                                ${actionButtons}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Agregar event listeners para los botones de acción
            attachCommentActionListeners();
        }
        
        // Actualizar contador en el botón de comentarios de la reseña
        const commentBtn = document.querySelector(`.comment-btn[data-review-id="${reviewId}"]`);
        if (commentBtn) {
            const countSpan = commentBtn.querySelector('.review-comments-count');
            if (countSpan) {
                countSpan.textContent = comments.length;
            }
        }
    }
    
    // Función para cerrar modal de comentarios
    function hideCommentsModal() {
        const modal = document.getElementById('commentsModalOverlay');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    // Función para enviar comentario
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
            await addCommentToBackend(reviewId, commentText);
            
            // Limpiar input
            commentInput.value = '';
            
            // Recargar comentarios
            await loadCommentsIntoModal(reviewId);
            
            // Si la vista detallada está abierta, también actualizar ahí
            const reviewDetailModal = document.getElementById('reviewDetailModalOverlay');
            if (reviewDetailModal && reviewDetailModal.style.display === 'flex') {
                await loadReviewDetailComments(reviewId);
                // Actualizar contador
                const commentsCount = document.getElementById('reviewDetailCommentsCount');
                if (commentsCount) {
                    const comments = await getComments(reviewId);
                    commentsCount.textContent = comments.length;
                }
            }
            
            showAlert('Comentario agregado exitosamente', 'success');
        } catch (error) {
            console.error('Error agregando comentario:', error);
            showAlert('Error al agregar el comentario', 'danger');
        }
    }
    
    // Función para agregar event listeners a los botones de acción de comentarios
    function attachCommentActionListeners() {
        // Botones de editar
        document.querySelectorAll('.comment-edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const commentId = this.getAttribute('data-comment-id');
                editComment(commentId);
            });
        });
        
        // Botones de eliminar
        document.querySelectorAll('.comment-delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const commentId = this.getAttribute('data-comment-id');
                deleteComment(commentId);
            });
        });
        
        // Botones de reportar
        document.querySelectorAll('.comment-report-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const commentId = this.getAttribute('data-comment-id');
                reportComment(commentId);
            });
        });
        
        // Botones de like en comentarios
        document.querySelectorAll('.comment-like-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const commentId = this.getAttribute('data-comment-id');
                toggleCommentLike(commentId, this);
            });
        });
    }
    
    // Función para dar like a un comentario
    async function toggleCommentLike(commentId, btn) {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showLoginRequiredModal();
            return;
        }
        
        const icon = btn.querySelector('i');
        const likesSpan = btn.querySelector('.comment-likes-count');
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
            console.log('Like en comentario simulado:', commentId);
        }
    }
    
    // Variable para almacenar el commentId que se está editando
    let editingCommentId = null;
    let originalCommentText = null;
    
    // Función para activar edición inline
    function showEditCommentModal(commentId) {
        console.log('🔍 [DEBUG] showEditCommentModal llamado con commentId:', commentId);
        
        const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
        const commentTextElement = document.getElementById(`comment-text-${commentId}`);
        
        console.log('🔍 [DEBUG] commentItem:', commentItem, 'commentTextElement:', commentTextElement);
        
        if (!commentItem || !commentTextElement) {
            console.error('❌ [DEBUG] No se encontró commentItem o commentTextElement');
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
        
        // Guardar commentId en el textarea como atributo de datos para poder recuperarlo después
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
            console.log('🔍 [DEBUG] Cancelar click, commentId:', btnCommentId);
            cancelEditComment(btnCommentId);
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
            console.log('🔍 [DEBUG] Confirmar click, commentId:', btnCommentId);
            confirmEditComment(btnCommentId);
        });
        
        buttonsContainer.appendChild(cancelBtn);
        buttonsContainer.appendChild(confirmBtn);
        
        // Reemplazar el elemento de texto con el textarea
        const commentContent = commentItem.querySelector('.comment-content');
        commentTextElement.replaceWith(textarea);
        
        // Agregar botones después del textarea
        textarea.parentNode.insertBefore(buttonsContainer, textarea.nextSibling);
            
        // Marcar el comentario como en edición
        commentItem.classList.add('editing');
        
        // Ocultar el footer mientras se edita
        const commentFooter = commentItem.querySelector('.comment-footer');
        if (commentFooter) {
            commentFooter.style.display = 'none';
        }
        
        // Enfocar el textarea
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }, 10);
    }
    
    // Función para cancelar edición inline
    function cancelEditComment(commentId) {
        const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
        if (!commentItem) return;
        
        const textarea = document.getElementById(`comment-text-edit-${commentId}`);
        const buttonsContainer = commentItem.querySelector('.comment-edit-buttons');
        const commentFooter = commentItem.querySelector('.comment-footer');
        
        if (textarea) {
            // Restaurar el elemento de texto original
            const commentTextElement = document.createElement('p');
            commentTextElement.className = 'comment-text';
            commentTextElement.id = `comment-text-${commentId}`;
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
    
    // Función para confirmar edición inline
    async function confirmEditComment(commentId) {
        console.log('🔍 [DEBUG] confirmEditComment llamado con commentId:', commentId);
        console.log('🔍 [DEBUG] editingCommentId actual:', editingCommentId);
        
        // Si no se pasa commentId, intentar obtenerlo del editingCommentId o del DOM
        if (!commentId || commentId === '') {
            if (editingCommentId) {
                commentId = editingCommentId;
                console.log('✅ [DEBUG] Usando editingCommentId como fallback:', commentId);
            } else {
                // Intentar obtener del botón que fue clickeado
                const activeEditItem = document.querySelector('.comment-item.editing');
                if (activeEditItem) {
                    commentId = activeEditItem.getAttribute('data-comment-id');
                    console.log('✅ [DEBUG] Usando commentId del DOM:', commentId);
                }
            }
        }
        
        if (!commentId || commentId === '') {
            console.error('❌ [DEBUG] No se pudo obtener commentId');
            showAlert('Error: No se pudo identificar el comentario a editar', 'danger');
            return;
        }
        
        // Actualizar editingCommentId si es necesario
        if (!editingCommentId || editingCommentId !== commentId) {
            editingCommentId = commentId;
        }
        
        const modal = document.getElementById('commentsModalOverlay');
        const reviewId = modal ? modal.getAttribute('data-review-id') : null;
        const textarea = document.getElementById(`comment-text-edit-${commentId}`);
        
        console.log('🔍 [DEBUG] reviewId:', reviewId, 'textarea:', textarea);
        
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
        // Actualizar comentario (simulado o real)
            await updateCommentInData(reviewId, commentId, newText);
        
        // Recargar comentarios para mostrar el texto actualizado
        await loadCommentsIntoModal(reviewId);
        
        // Si la vista detallada está abierta, también actualizar ahí
        const reviewDetailModal = document.getElementById('reviewDetailModalOverlay');
        if (reviewDetailModal && reviewDetailModal.style.display === 'flex') {
            await loadReviewDetailComments(reviewId);
        }
        
        showAlert('Comentario editado exitosamente', 'success');
        } catch (error) {
            console.error('❌ Error al actualizar comentario:', error);
            showAlert('Error al actualizar el comentario. Por favor, intenta nuevamente.', 'danger');
        }
        
        // Limpiar variables
        editingCommentId = null;
        originalCommentText = null;
    }
    
    // Función para editar comentario
    function editComment(commentId) {
        showEditCommentModal(commentId);
    }
    
    // Función para actualizar comentario en los datos
    async function updateCommentInData(reviewId, commentId, newText) {
        const authToken = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        
        if (!authToken || !userId) {
            console.error('No hay token o userId para actualizar comentario');
            return;
        }
        
        // Si es modo desarrollo, actualizar en commentsData
        if (authToken.startsWith('dev-token-')) {
            if (commentsData[reviewId]) {
                const comment = commentsData[reviewId].find(c => 
                    (c.Id_Comment || c.id) === commentId
                );
                if (comment) {
                    comment.Text = newText;
                    comment.Updated = new Date().toISOString();
                }
            }
            return;
        }
        
            // Modo real: actualizar en el backend
        const GATEWAY_BASE_URL = 'http://localhost:5000';
        try {
            console.log('📤 Actualizando comentario en backend:', { commentId, newText });
            const response = await axios.put(
                `${GATEWAY_BASE_URL}/api/gateway/comments/${commentId}`,
                {
                    Text: newText
                },
                {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                }
            );
            console.log('✅ Comentario actualizado exitosamente:', response.data);
        } catch (error) {
            console.error('❌ Error actualizando comentario:', error);
            // Si falla el gateway, intentar con el Social Service directamente
            try {
            const SOCIAL_API_BASE_URL = 'http://localhost:8002';
                const response = await axios.put(
                    `${SOCIAL_API_BASE_URL}/api/Comments/${commentId}`,
                    {
                        Text: newText
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 5000
                    }
                );
                console.log('✅ Comentario actualizado exitosamente (directo):', response.data);
            } catch (directError) {
                console.error('❌ Error actualizando comentario (directo):', directError);
                throw directError;
            }
        }
    }
    
    // Variable para almacenar el commentId que se está eliminando
    let deletingCommentId = null;
    
    // Función para mostrar modal de eliminación
    function showDeleteCommentModal(commentId) {
        deletingCommentId = commentId;
        document.getElementById('deleteCommentModalOverlay').style.display = 'flex';
    }
    
    // Función para cerrar modal de eliminación
    function hideDeleteCommentModal() {
        document.getElementById('deleteCommentModalOverlay').style.display = 'none';
        deletingCommentId = null;
    }
    
    // Función para confirmar eliminación
    async function confirmDeleteComment() {
        if (!deletingCommentId) return;
        
        const modal = document.getElementById('commentsModalOverlay');
        const reviewId = modal ? modal.getAttribute('data-review-id') : null;
        
        if (!reviewId) return;
        
        const authToken = localStorage.getItem('authToken');
        
        // Si es modo desarrollo, eliminar de commentsData
        if (authToken && authToken.startsWith('dev-token-')) {
            if (commentsData[reviewId]) {
                commentsData[reviewId] = commentsData[reviewId].filter(c => 
                    (c.Id_Comment || c.id) !== deletingCommentId
                );
            }
        } else {
            // Modo real: eliminar del backend a través del gateway
            const GATEWAY_BASE_URL = 'http://localhost:5000';
            const authToken = localStorage.getItem('authToken');
            
            try {
                await axios.delete(`${GATEWAY_BASE_URL}/api/gateway/comments/${deletingCommentId}`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.error('Error eliminando comentario:', error);
                showAlert('Error al eliminar el comentario', 'danger');
                hideDeleteCommentModal();
                return;
            }
        }
        
        // Cerrar modal de eliminación
        hideDeleteCommentModal();
        
        // Recargar comentarios
        await loadCommentsIntoModal(reviewId);
        
        // Si la vista detallada está abierta, también actualizar ahí
        const reviewDetailModal = document.getElementById('reviewDetailModalOverlay');
        if (reviewDetailModal && reviewDetailModal.style.display === 'flex') {
            await loadReviewDetailComments(reviewId);
            // Actualizar contador
            const commentsCount = document.getElementById('reviewDetailCommentsCount');
            if (commentsCount) {
                const comments = await getComments(reviewId);
                commentsCount.textContent = comments.length;
            }
        }
        
        showAlert('Comentario eliminado exitosamente', 'success');
    }
    
    // Función para eliminar comentario (ahora solo abre el modal)
    function deleteComment(commentId) {
        showDeleteCommentModal(commentId);
    }
    
    // Variable para almacenar el commentId que se está reportando
    let reportingCommentId = null;
    
    // Función para mostrar modal de reporte
    function showReportCommentModal(commentId) {
        reportingCommentId = commentId;
        
        // Resetear el formulario
        document.querySelectorAll('.report-radio').forEach(radio => {
            radio.checked = false;
        });
        const textarea = document.getElementById('reportCommentTextarea');
        if (textarea) {
            textarea.value = '';
            textarea.style.display = 'none';
        }
        
        // Deshabilitar botón de confirmar hasta que se seleccione una opción
        const confirmBtn = document.getElementById('confirmReportCommentBtn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
        }
        
        document.getElementById('reportCommentModalOverlay').style.display = 'flex';
    }
    
    // Función para cerrar modal de reporte
    function hideReportCommentModal() {
        document.getElementById('reportCommentModalOverlay').style.display = 'none';
        reportingCommentId = null;
        
        // Resetear formulario
        document.querySelectorAll('.report-radio').forEach(radio => {
            radio.checked = false;
        });
        const textarea = document.getElementById('reportCommentTextarea');
        if (textarea) {
            textarea.value = '';
            textarea.style.display = 'none';
        }
        
        const confirmBtn = document.getElementById('confirmReportCommentBtn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
        }
    }
    
    // Función para confirmar reporte
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
        
        // TODO: Implementar reporte en el backend cuando esté disponible
        const reportData = {
            commentId: reportingCommentId,
            reason: reason,
            additionalInfo: additionalInfo
        };
        
        console.log('Reportar comentario:', reportData);
        
        // Cerrar modal
        hideReportCommentModal();
        
        // Mostrar mensaje de éxito
        showAlert('Comentario reportado. Gracias por tu reporte. Lo revisaremos pronto.', 'success');
    }
    
    // Función para reportar comentario (ahora solo abre el modal)
    function reportComment(commentId) {
        showReportCommentModal(commentId);
    }
    
    // Función para reportar reseña (similar a reportar comentario)
    function reportReview(reviewId) {
        // Por ahora, usar el mismo modal de reporte pero adaptado para reseñas
        // TODO: Crear modal específico para reportar reseñas si es necesario
        showAlert('Funcionalidad de reportar reseña en desarrollo. Próximamente disponible.', 'info');
    }

    // Notifications dropdown functionality
    // notifications ya está declarado al inicio del archivo
    
    function initializeNotificationsDropdown() {
    const notificationsBtn = document.getElementById('notificationsBtn');
        const notificationsDropdown = document.getElementById('notificationsDropdown');
        const profileDropdown = document.getElementById('profileDropdown');
        
        if (notificationsBtn && notificationsDropdown) {
            notificationsBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                
                // Cerrar dropdown de perfil si está abierto
                if (profileDropdown) {
                    profileDropdown.style.display = 'none';
                }
                
                // Toggle del dropdown de notificaciones
                const isVisible = notificationsDropdown.style.display === 'block';
                notificationsDropdown.style.display = isVisible ? 'none' : 'block';
                
                // Remover badge cuando se abre el dropdown
                const badge = notificationsBtn.querySelector('.notification-badge');
                if (badge) {
                    badge.remove();
                }
            });
            
            // Cerrar dropdown al hacer clic fuera
            document.addEventListener('click', function(e) {
                if (!notificationsBtn.contains(e.target) && !notificationsDropdown.contains(e.target)) {
                    notificationsDropdown.style.display = 'none';
                }
            });
        }
    }
    
    function renderNotifications() {
        const notificationsList = document.getElementById('notificationsList');
        if (!notificationsList) return;
        
        if (notifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>No tienes notificaciones</p>
                </div>
            `;
            return;
        }
        
        // Ordenar notificaciones por fecha (más recientes primero)
        const sortedNotifications = [...notifications].sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date) : new Date(0);
            return dateB - dateA;
        });
        
        notificationsList.innerHTML = sortedNotifications.map(notification => {
            const icon = getNotificationIcon(notification.type);
            const text = getNotificationText(notification);
            const time = formatNotificationTime(notification.date);
            
            return `
                <div class="notification-item">
                    <div class="notification-icon">
                        <i class="${icon}"></i>
                    </div>
                    <div class="notification-content">
                        <p class="notification-text">${text}</p>
                        <span class="notification-time">${time}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function getNotificationIcon(type) {
        switch(type) {
            case 'NewReaction':
            case 'NewNotification':
                return 'fas fa-heart';
            case 'NewComment':
                return 'fas fa-comment';
            case 'NewFollower':
                return 'fas fa-user-plus';
            default:
                return 'fas fa-bell';
        }
    }
    
    function getNotificationText(notification) {
        const username = notification.username || 'Alguien';
        
        switch(notification.type) {
            case 'NewReaction':
            case 'NewNotification':
                return `<span class="notification-username">${username}</span> le dio me gusta a tu reseña`;
            case 'NewComment':
                const songName = notification.songName || 'tu reseña';
                return `<span class="notification-username">${username}</span> comentó en tu review de <strong>${songName}</strong>`;
            case 'NewFollower':
                return `<span class="notification-username">${username}</span> comenzó a seguirte`;
            default:
                return `Nueva notificación de <span class="notification-username">${username}</span>`;
        }
    }
    
    function formatNotificationTime(dateString) {
        if (!dateString) return 'Ahora';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours} h`;
        if (diffDays < 7) return `Hace ${diffDays} días`;
        
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
    
    function addNotification(notification) {
        // Verificar si la notificación ya existe (evitar duplicados)
        const exists = notifications.some(n => 
            n.type === notification.type &&
            n.reviewId === notification.reviewId &&
            n.username === notification.username &&
            Math.abs(new Date(n.date) - new Date(notification.date)) < 1000 // Mismo segundo
        );
        
        if (exists) {
            return; // No agregar duplicados
        }
        
        // Agregar notificación al array
        notifications.push({
            ...notification,
            date: notification.date || new Date().toISOString(),
            username: notification.username || 'Usuario',
            songName: notification.songName || null
        });
        
        // Renderizar notificaciones
        renderNotifications();
        
        // Mostrar badge en el botón
        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn && !notificationsBtn.querySelector('.notification-badge')) {
            const badge = document.createElement('span');
            badge.className = 'notification-badge';
            badge.textContent = '!';
            notificationsBtn.appendChild(badge);
        }
    }

    // Función para cargar notificaciones existentes desde el backend
    async function loadNotifications() {
        const authToken = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        
        if (!authToken || !userId) {
            return;
        }
        
        const GATEWAY_BASE_URL = 'http://localhost:5000';
        
        try {
            const response = await axios.get(`${GATEWAY_BASE_URL}/api/gateway/notifications`, {
                params: { 
                    userId: userId,
                    state: 'Unread'
                },
                headers: {
                    'Authorization': `Bearer ${authToken}`
                },
                timeout: 5000
            });
            
            const notificationsData = response.data || [];
            
            // Limpiar notificaciones existentes
            notifications = [];
            
            // Agregar cada notificación al array
            notificationsData.forEach(notification => {
                // Mapear la respuesta del backend al formato esperado
                addNotification({
                    type: notification.Type || notification.type || 'NewNotification',
                    date: notification.Date || notification.date || new Date().toISOString(),
                    username: notification.Username || notification.username || 'Usuario',
                    songName: notification.SongName || notification.songName || null,
                    reviewId: notification.ReviewId || notification.reviewId || null
                });
            });
            
            // Renderizar notificaciones
            renderNotifications();
            
        } catch (error) {
            // Silenciar errores de timeout y conexión cuando el servicio no está disponible
            const status = error.response?.status;
            const errorCode = error.code;
            const errorMessage = error?.message || String(error);
            
            const isExpectedError = status === 404 || 
                                  status === 502 || 
                                  status === 503 ||
                                  errorCode === 'ECONNABORTED' ||
                                  errorMessage.includes('timeout') ||
                                  errorMessage.includes('Network Error') ||
                                  errorMessage.includes('ERR_CONNECTION_REFUSED');
            
            if (!isExpectedError) {
                console.error('Error cargando notificaciones:', error);
            } else {
                // Solo loguear en modo debug para errores esperados
                console.debug('Servicio de notificaciones no disponible');
            }
        }
    }

    // ========== SISTEMA DE NOTIFICACIONES POR POLLING (FRONTEND) ==========
    
    // Función para obtener las reseñas del usuario actual
    async function getUserReviews() {
        const authToken = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        const GATEWAY_BASE_URL = 'http://localhost:5000';
        
        if (!authToken || !userId) {
            return [];
        }
        
        try {
            // Obtener todas las reseñas
            const response = await axios.get(`${GATEWAY_BASE_URL}/api/gateway/reviews`, {
                timeout: 5000
            });
            
            const allReviews = response.data || [];
            
            // Filtrar solo las reseñas del usuario actual
            const userReviews = allReviews.filter(review => {
                const reviewUserId = review.UserId || review.userId;
                return reviewUserId && (
                    reviewUserId.toString() === userId.toString() ||
                    reviewUserId === userId
                );
            });
            
            return userReviews;
        } catch (error) {
            // Silenciar errores esperados
            const status = error.response?.status;
            const errorCode = error.code;
            const errorMessage = error?.message || String(error);
            
            const isExpectedError = status === 404 || 
                                  status === 502 || 
                                  status === 503 ||
                                  errorCode === 'ECONNABORTED' ||
                                  errorMessage.includes('timeout') ||
                                  errorMessage.includes('Network Error') ||
                                  errorMessage.includes('ERR_CONNECTION_REFUSED');
            
            if (!isExpectedError) {
                console.error('Error obteniendo reseñas del usuario:', error);
            }
            
            return [];
        }
    }
    
    // Función para obtener el contador de likes de una reseña
    async function getReviewLikesCount(reviewId) {
        const GATEWAY_BASE_URL = 'http://localhost:5000';
        
        try {
            const response = await axios.get(
                `${GATEWAY_BASE_URL}/api/gateway/reviews/${reviewId}/reactions/count`,
                { timeout: 3000 }
            );
            return response.data?.count || 0;
        } catch (error) {
            // Si falla, intentar con el Social Service directamente
            try {
                const SOCIAL_API_BASE_URL = 'http://localhost:8002';
                const response = await axios.get(
                    `${SOCIAL_API_BASE_URL}/api/reactions/review/${reviewId}/count`,
                    { timeout: 3000 }
                );
                return response.data?.count || 0;
            } catch (e) {
                return 0;
            }
        }
    }
    
    // Función para obtener el contador de comentarios de una reseña
    async function getReviewCommentsCount(reviewId) {
        const GATEWAY_BASE_URL = 'http://localhost:5000';
        
        try {
            const response = await axios.get(
                `${GATEWAY_BASE_URL}/api/gateway/reviews/${reviewId}/comments`,
                { timeout: 3000 }
            );
            return response.data?.length || 0;
        } catch (error) {
            // Si falla, intentar con el Social Service directamente
            try {
                const SOCIAL_API_BASE_URL = 'http://localhost:8002';
                const response = await axios.get(
                    `${SOCIAL_API_BASE_URL}/api/Comments/review/${reviewId}`,
                    { timeout: 3000 }
                );
                return response.data?.length || 0;
            } catch (e) {
                return 0;
            }
        }
    }
    
    // Función para obtener información de la canción/álbum de una reseña
    async function getReviewContentInfo(reviewId) {
        const GATEWAY_BASE_URL = 'http://localhost:5000';
        
        try {
            const response = await axios.get(
                `${GATEWAY_BASE_URL}/api/review-details/${reviewId}`,
                { timeout: 3000 }
            );
            
            const review = response.data?.review || response.data;
            if (review) {
                return {
                    songName: review.song || review.Song || review.songName || review.SongName || 'Canción',
                    artistName: review.artist || review.Artist || review.artistName || review.ArtistName || 'Artista'
                };
            }
        } catch (error) {
            // Silenciar errores esperados
        }
        
        return {
            songName: 'Canción',
            artistName: 'Artista'
        };
    }
    
    // Función principal de polling para detectar cambios
    async function checkForNotifications(isInitialLoad = false) {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            stopNotificationPolling();
            return;
        }
        
        try {
            // Obtener reseñas del usuario
            const userReviews = await getUserReviews();
            
            // Para cada reseña, verificar cambios
            for (const review of userReviews) {
                const reviewId = review.id || review.ReviewId || review.reviewId;
                if (!reviewId) continue;
                
                const reviewIdStr = String(reviewId);
                
                // Obtener contadores actuales
                const currentLikes = await getReviewLikesCount(reviewIdStr);
                const currentComments = await getReviewCommentsCount(reviewIdStr);
                
                // Obtener estado anterior
                const previousState = userReviewsState[reviewIdStr];
                
                // Si es la primera carga, solo inicializar el estado sin mostrar notificaciones
                if (isInitialLoad || !previousState) {
                    userReviewsState[reviewIdStr] = {
                        likes: currentLikes,
                        comments: currentComments
                    };
                    continue; // No mostrar notificaciones en la primera carga
                }
                
                // Detectar nuevos likes
                if (currentLikes > previousState.likes) {
                    const newLikes = currentLikes - previousState.likes;
                    const contentInfo = await getReviewContentInfo(reviewIdStr);
                    
                    // Crear notificación
                    addNotification({
                        type: 'NewReaction',
                        date: new Date().toISOString(),
                        username: newLikes === 1 ? 'Alguien' : `${newLikes} personas`,
                        songName: contentInfo.songName,
                        reviewId: reviewIdStr
                    });
                    
                    // Reproducir sonido y mostrar alerta
                    playNotificationSound();
                    showAlert(
                        newLikes === 1 
                            ? `¡Alguien le dio me gusta a tu reseña de "${contentInfo.songName}"!`
                            : `¡${newLikes} personas le dieron me gusta a tu reseña de "${contentInfo.songName}"!`,
                        'info'
                    );
                }
                
                // Detectar nuevos comentarios
                if (currentComments > previousState.comments) {
                    const newComments = currentComments - previousState.comments;
                    const contentInfo = await getReviewContentInfo(reviewIdStr);
                    
                    // Crear notificación
                    addNotification({
                        type: 'NewComment',
                        date: new Date().toISOString(),
                        username: newComments === 1 ? 'Alguien' : `${newComments} personas`,
                        songName: contentInfo.songName,
                        reviewId: reviewIdStr
                    });
                    
                    // Reproducir sonido y mostrar alerta
                    playNotificationSound();
                    showAlert(
                        newComments === 1
                            ? `¡Alguien comentó tu reseña de "${contentInfo.songName}"!`
                            : `¡${newComments} personas comentaron tu reseña de "${contentInfo.songName}"!`,
                        'info'
                    );
                }
                
                // Actualizar estado
                userReviewsState[reviewIdStr] = {
                    likes: currentLikes,
                    comments: currentComments
                };
            }
            
        } catch (error) {
            // Silenciar errores de polling (no es crítico)
            console.debug('Error en polling de notificaciones:', error);
        }
    }
    
    // Función para iniciar el polling de notificaciones
    function startNotificationPolling() {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            return;
        }
        
        // Detener polling anterior si existe
        stopNotificationPolling();
        
        // Inicializar estado con la primera verificación (sin mostrar notificaciones)
        checkForNotifications(true);
        
        // Iniciar polling cada 15 segundos
        notificationPollingInterval = setInterval(() => {
            checkForNotifications(false);
        }, 15000); // 15 segundos
        
        console.log('✅ Polling de notificaciones iniciado (cada 15 segundos)');
    }
    
    // Función para detener el polling de notificaciones
    function stopNotificationPolling() {
        if (notificationPollingInterval) {
            clearInterval(notificationPollingInterval);
            notificationPollingInterval = null;
            console.log('⏹️ Polling de notificaciones detenido');
        }
    }
    
    // Inicializar dropdown de notificaciones
    initializeNotificationsDropdown();
    
    // Inicializar modal de comentarios
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
        commentInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                submitComment();
            }
        });
    }
    
    if (commentsModalOverlay) {
        commentsModalOverlay.addEventListener('click', function(e) {
            if (e.target === commentsModalOverlay) {
                hideCommentsModal();
            }
        });
    }
    
    // Inicializar modal de contenido del carrusel
    const closeCarouselContentModal = document.getElementById('closeCarouselContentModal');
    const carouselContentModalOverlay = document.getElementById('carouselContentModalOverlay');
    
    if (closeCarouselContentModal) {
        closeCarouselContentModal.addEventListener('click', hideCarouselContentModal);
    }
    
    if (carouselContentModalOverlay) {
        carouselContentModalOverlay.addEventListener('click', function(e) {
            if (e.target === carouselContentModalOverlay) {
                hideCarouselContentModal();
            }
        });
    }
    
    // Inicializar modal de vista detallada de reseña
    const closeReviewDetailModal = document.getElementById('closeReviewDetailModal');
    const reviewDetailModalOverlay = document.getElementById('reviewDetailModalOverlay');
    const reviewDetailSubmitCommentBtn = document.getElementById('reviewDetailSubmitCommentBtn');
    const reviewDetailCommentInput = document.getElementById('reviewDetailCommentInput');
    
    if (closeReviewDetailModal) {
        closeReviewDetailModal.addEventListener('click', hideReviewDetailModal);
    }
    
    if (reviewDetailModalOverlay) {
        reviewDetailModalOverlay.addEventListener('click', function(e) {
            if (e.target === reviewDetailModalOverlay) {
                hideReviewDetailModal();
            }
        });
    }
    
    // Función para enviar comentario desde vista detallada
    async function submitReviewDetailComment() {
        const modal = document.getElementById('reviewDetailModalOverlay');
        if (!modal) return;
        
        // Obtener reviewId del contenido renderizado
        const likeBtn = document.getElementById('reviewDetailLikeBtn');
        const reviewId = likeBtn ? likeBtn.getAttribute('data-review-id') : null;
        const commentInput = document.getElementById('reviewDetailCommentInput');
        
        if (!reviewId || !commentInput) {
            console.error('No se pudo obtener reviewId o commentInput');
            return;
        }
        
        const commentText = commentInput.value.trim();
        if (!commentText) {
            showAlert('Por favor, escribe un comentario', 'warning');
            return;
        }
        
        try {
            await addCommentToBackend(reviewId, commentText);
            commentInput.value = '';
            
            // Recargar comentarios en la vista detallada
            await loadReviewDetailComments(reviewId);
            
            // Actualizar contador
            const commentsCount = document.getElementById('reviewDetailCommentsCount');
            if (commentsCount) {
                const comments = await getComments(reviewId);
                commentsCount.textContent = comments.length;
            }
            
            showAlert('Comentario agregado exitosamente', 'success');
        } catch (error) {
            console.error('Error agregando comentario:', error);
            showAlert('Error al agregar el comentario', 'danger');
        }
    }
    
    if (reviewDetailSubmitCommentBtn) {
        reviewDetailSubmitCommentBtn.addEventListener('click', submitReviewDetailComment);
    }
    
    if (reviewDetailCommentInput) {
        reviewDetailCommentInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                submitReviewDetailComment();
            }
        });
    }
    
    // Función para mostrar modal de contenido del carrusel
    async function showCarouselContentModal(categoryId, categoryTitle, categoryText, categoryDescription, categoryData) {
        const modal = document.getElementById('carouselContentModalOverlay');
        if (!modal) {
            console.error('Modal de contenido del carrusel no encontrado');
            return;
        }
        
        // Mostrar modal
        modal.style.display = 'flex';
        
        // Actualizar título
        const titleElement = document.getElementById('carouselContentTitle');
        if (titleElement) {
            titleElement.textContent = categoryTitle;
        }
        
        // Actualizar descripción
        const descriptionElement = document.getElementById('carouselContentDescription');
        if (descriptionElement) {
            descriptionElement.innerHTML = `
                <p class="carousel-content-desc-text">${categoryText}</p>
                <p class="carousel-content-desc-subtitle">${categoryDescription}</p>
            `;
        }
        
        // Mostrar loading
        const contentList = document.getElementById('carouselContentList');
        if (contentList) {
            contentList.innerHTML = '<div style="padding: 2rem; text-align: center; color: rgba(255,255,255,0.7);">Cargando contenido...</div>';
        }
        
        try {
            // Cargar contenido según la categoría
            const content = await loadCarouselContent(categoryId, categoryData);
            
            // Actualizar imagen del header con la primera imagen del contenido
            const headerImage = document.getElementById('carouselContentHeaderImage');
            if (headerImage && content.length > 0) {
                const firstImage = content[0].image || content[0].albumImage || content[0].artistImage;
                if (firstImage && firstImage !== '../Assets/default-avatar.png') {
                    headerImage.src = firstImage;
                    headerImage.style.display = 'block';
                }
            }
            
            // Renderizar contenido
            if (contentList) {
                if (content.length === 0) {
                    contentList.innerHTML = `
                        <div class="carousel-content-empty">
                            <i class="fas fa-music"></i>
                            <p>No hay contenido disponible en este momento</p>
                        </div>
                    `;
                } else {
                    // DEBUG: Verificar el contenido antes de renderizar
                    console.log('[Render] Contenido completo antes de renderizar:', content.map(c => ({
                        id: c.id,
                        name: c.name,
                        image: c.image,
                        songId: c.songId,
                        albumId: c.albumId,
                        type: c.type,
                        isSimulated: c.id?.startsWith('sim-'),
                        imageType: typeof c.image,
                        imageLength: c.image ? c.image.length : 0
                    })));
                    
                    contentList.innerHTML = content.map((item, index) => {
                        // Prioridad: image > albumImage > artistImage > default
                        // IMPORTANTE: Verificar que item.image no sea null/undefined antes de usar
                        const imageUrl = item.image && item.image !== '../Assets/default-avatar.png' 
                            ? item.image 
                            : (item.albumImage || item.artistImage || '../Assets/default-avatar.png');
                        const rating = item.rating || item.averageRating || 0;
                        const stars = renderStars(rating);
                        
                        // DEBUG: Log para verificar la URL de la imagen
                        console.log(`[Render] Item ${index + 1} (${item.type}):`, {
                            name: item.name,
                            itemImage: item.image,
                            imageUrl: imageUrl,
                            hasImage: !!item.image,
                            imageIsDefault: item.image === '../Assets/default-avatar.png'
                        });
                        
                        return `
                            <div class="carousel-content-item" data-content-id="${item.id || index}">
                                <div class="carousel-content-item-number">${index + 1}</div>
                                <img src="${imageUrl}" 
                                     alt="${item.name || item.title}" 
                                     class="carousel-content-item-image"
                                     onerror="console.error('Error cargando imagen:', this.src); this.src='../Assets/default-avatar.png';">
                                <div class="carousel-content-item-info">
                                    <h4 class="carousel-content-item-name">${item.name || item.title || 'Sin nombre'}</h4>
                                    <p class="carousel-content-item-artist">${item.artist || item.artistName || 'Artista desconocido'}</p>
                                    ${item.type ? `<span class="carousel-content-item-type">${item.type === 'song' ? 'Canción' : 'Álbum'}</span>` : ''}
                                </div>
                                <div class="carousel-content-item-stats">
                                    ${rating > 0 ? `
                                        <div class="carousel-content-item-rating">
                                            <div class="carousel-content-item-stars">${stars}</div>
                                            <span class="carousel-content-item-rating-value">${rating.toFixed(1)}</span>
                                        </div>
                                    ` : ''}
                                    ${item.reviewsCount !== undefined ? `
                                        <div class="carousel-content-item-reviews">
                                            <i class="fas fa-comment"></i>
                                            <span>${item.reviewsCount}</span>
                                        </div>
                                    ` : ''}
                                    ${item.commentsCount !== undefined ? `
                                        <div class="carousel-content-item-comments">
                                            <i class="fas fa-comments"></i>
                                            <span>${item.commentsCount}</span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }).join('');
                }
            }
        } catch (error) {
            console.error('Error cargando contenido del carrusel:', error);
            if (contentList) {
                contentList.innerHTML = '<div style="padding: 2rem; text-align: center; color: rgba(255,255,255,0.7);">Error al cargar el contenido</div>';
            }
        }
    }
    
    // Función para cargar contenido según la categoría
    async function loadCarouselContent(categoryId, categoryData) {
        const GATEWAY_BASE_URL = 'http://localhost:5000';
        const contentMap = new Map(); // Para evitar duplicados y agrupar por contenido
        
        try {
            // 1. Obtener todas las reseñas
            const reviewsResponse = await axios.get(`${GATEWAY_BASE_URL}/api/gateway/reviews`, { timeout: 5000 });
            const reviews = reviewsResponse.data || [];
            
            if (reviews.length === 0) {
                // Si no hay reseñas, retornar datos simulados
                return await generateSimulatedContent(categoryId);
            }
            
            // 2. Procesar cada reseña para agrupar por contenido
            for (const review of reviews) {
                const songId = review.SongId || review.songId;
                const albumId = review.AlbumId || review.albumId;
                const rating = review.Rating || review.rating || 0;
                const reviewId = review.ReviewId || review.reviewId || review.id;
                
                if (!songId && !albumId) continue;
                
                const contentId = songId || albumId;
                const contentType = songId ? 'song' : 'album';
                
                // Obtener o crear entrada en el mapa
                if (!contentMap.has(contentId)) {
                    contentMap.set(contentId, {
                        id: contentId,
                        songId: songId,
                        albumId: albumId,
                        type: contentType,
                        ratings: [],
                        reviewsCount: 0,
                        commentsCount: 0,
                        name: null,
                        title: null,
                        artist: null,
                        artistName: null,
                        image: null // Inicializar como null, no como default
                    });
                }
                
                const content = contentMap.get(contentId);
                content.ratings.push(rating);
                content.reviewsCount++;
                
                // Obtener comentarios para este review
                try {
                    const commentsResponse = await axios.get(
                        `${GATEWAY_BASE_URL}/api/gateway/reviews/${reviewId}/comments`,
                        { timeout: 2000 }
                    );
                    const comments = Array.isArray(commentsResponse.data) ? commentsResponse.data : [];
                    content.commentsCount += comments.length;
                } catch (e) {
                    // Silenciar errores de comentarios
                }
            }
            
            // 3. Obtener detalles de contenido (imágenes, nombres, artistas)
            // PRIMERO: Intentar desde localStorage (datos guardados al crear reviews)
            // SEGUNDO: Intentar desde Content Service (pero puede fallar si el ID es GUID interno)
            const contentArray = Array.from(contentMap.values());
            
            await Promise.all(contentArray.map(async (content) => {
                let contentData = null;
                let foundInStorage = false;
                
                // PRIMERO: Intentar obtener desde localStorage usando las reviews
                // Buscar en todas las reviews que tienen este SongId o AlbumId
                for (const review of reviews) {
                    // Verificar si esta review corresponde al contenido que estamos buscando
                    const reviewSongId = review.SongId || review.songId;
                    const reviewAlbumId = review.AlbumId || review.albumId;
                    
                    const matchesContent = (content.type === 'song' && reviewSongId && String(reviewSongId).trim() === String(content.songId).trim()) ||
                                         (content.type === 'album' && reviewAlbumId && String(reviewAlbumId).trim() === String(content.albumId).trim());
                    
                    if (!matchesContent) continue;
                    
                    const reviewId = review.ReviewId || review.reviewId || review.id;
                    if (!reviewId) continue;
                    
                    const normalizedReviewId = String(reviewId).trim();
                    const storageKey = `review_content_${normalizedReviewId}`;
                    const storedContentData = localStorage.getItem(storageKey);
                    
                    if (storedContentData) {
                        try {
                            const parsed = JSON.parse(storedContentData);
                            // Verificar que el tipo coincida (no necesitamos verificar el ID porque ya verificamos matchesContent)
                            const contentMatches = (content.type === 'song' && parsed.type === 'song') ||
                                                  (content.type === 'album' && parsed.type === 'album');
                            
                            if (contentMatches) {
                                // Usar los datos de localStorage incluso si el nombre es 'Canción' o 'Álbum'
                                // porque al menos tenemos la imagen
                                contentData = parsed;
                                foundInStorage = true;
                                
                                // Usar los datos de localStorage
                                if (parsed.name && parsed.name !== 'Canción' && parsed.name !== 'Álbum') {
                                    content.name = parsed.name || parsed.title || parsed.Name || parsed.Title;
                                    content.title = content.name;
                                }
                                
                                if (parsed.artist && parsed.artist !== 'Artista') {
                                    content.artist = parsed.artist || parsed.artistName || parsed.Artist || parsed.ArtistName;
                                    content.artistName = content.artist;
                                }
                                
                                // SIEMPRE usar la imagen de localStorage si existe (incluso si es default)
                                // Prioridad: image > Image > albumImage > AlbumImage
                                const storedImage = parsed.image || parsed.Image || parsed.albumImage || parsed.AlbumImage;
                                if (storedImage) {
                                    content.image = storedImage;
                                    console.log(`✅ [Carousel] Imagen encontrada en localStorage para ${content.type} ${content.id}:`, storedImage);
                                }
                                
                                // Si encontramos datos válidos (al menos nombre o imagen), salir
                                if (content.name && content.name !== 'Canción' && content.name !== 'Álbum') {
                                    break;
                                }
                                // Si al menos tenemos imagen, también podemos salir
                                if (content.image && content.image !== '../Assets/default-avatar.png') {
                                    break;
                                }
                            }
                        } catch (e) {
                            // Ignorar errores de parsing
                            console.debug('Error parseando datos de localStorage:', e);
                        }
                    }
                }
                
                // SEGUNDO: Si no encontramos en localStorage, NO intentar desde Content Service
                // porque el Content Service espera APISongId/APIAlbumId (IDs de Spotify),
                // pero tenemos SongId/AlbumId (GUIDs internos), lo cual siempre falla con 500.
                // En su lugar, usaremos valores por defecto que se establecerán más abajo.
                
                // Asegurar que tenemos valores por defecto si no se encontraron datos
                if (!content.name || content.name === 'Canción' || content.name === 'Álbum') {
                    content.name = content.type === 'song' ? 'Canción' : 'Álbum';
                    content.title = content.name;
                }
                if (!content.artist || content.artist === 'Artista') {
                    content.artist = 'Artista desconocido';
                    content.artistName = content.artist;
                }
                // Asegurar que siempre tenemos una imagen
                // Si no tenemos imagen (null o undefined) y no encontramos en localStorage, usar default
                if (!content.image) {
                    content.image = '../Assets/default-avatar.png';
                }
                // Si la imagen es la default pero encontramos datos en localStorage sin imagen, mantener default
                // (esto significa que la imagen no estaba guardada en localStorage)
                
                // DEBUG: Log para verificar qué datos tenemos
                console.log(`[Carousel Content] ${content.type} ${content.id}:`, {
                    name: content.name,
                    artist: content.artist,
                    image: content.image,
                    foundInStorage: foundInStorage
                });
                
                // Calcular rating promedio
                if (content.ratings.length > 0) {
                    const sum = content.ratings.reduce((a, b) => a + b, 0);
                    content.rating = sum / content.ratings.length;
                    content.averageRating = content.rating;
                } else {
                    content.rating = 0;
                    content.averageRating = 0;
                }
            }));
            
            // 4. Filtrar y ordenar según la categoría
            let filteredContent = contentArray.filter(c => c.reviewsCount > 0);
            
            switch (categoryId) {
                case 'lo-mas-recomendado':
                    // Ordenar por rating promedio (mínimo 3 reseñas)
                    filteredContent = filteredContent
                        .filter(c => c.reviewsCount >= 3)
                        .sort((a, b) => b.rating - a.rating)
                        .slice(0, 10);
                    break;
                case 'lo-mas-comentado':
                    // Ordenar por cantidad de comentarios
                    filteredContent = filteredContent
                        .sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0))
                        .slice(0, 10);
                    break;
                case 'top-10-semana':
                    // Ordenar por score combinado (rating + comentarios)
                    // IMPORTANTE: Preservar todas las propiedades incluyendo image
                    filteredContent = filteredContent
                        .map(c => {
                            const item = {
                                ...c, // Preservar todas las propiedades (id, name, artist, image, etc.)
                                score: (c.rating * 0.7) + ((c.commentsCount || 0) * 0.3)
                            };
                            // Asegurar que image se preserve
                            if (c.image) {
                                item.image = c.image;
                            }
                            return item;
                        })
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 10);
                    break;
                case 'top-50-mes':
                    // Similar a top-10 pero más elementos
                    // IMPORTANTE: Preservar todas las propiedades incluyendo image
                    filteredContent = filteredContent
                        .map(c => {
                            const item = {
                                ...c, // Preservar todas las propiedades (id, name, artist, image, etc.)
                                score: (c.rating * 0.7) + ((c.commentsCount || 0) * 0.3)
                            };
                            // Asegurar que image se preserve
                            if (c.image) {
                                item.image = c.image;
                            }
                            return item;
                        })
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 50);
                    break;
                case 'trending':
                    // Ordenar por actividad reciente (simulado: más comentarios recientes)
                    filteredContent = filteredContent
                        .sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0))
                        .slice(0, 10);
                    break;
                default:
                    filteredContent = filteredContent
                        .sort((a, b) => b.rating - a.rating)
                        .slice(0, 10);
            }
            
            // 5. Si no hay suficiente contenido real, completar con datos simulados
            // IMPORTANTE: Los datos reales siempre tienen prioridad y mantienen sus imágenes
            if (filteredContent.length < 5) {
                const simulated = await generateSimulatedContent(categoryId);
                // Combinar: primero los datos reales (con sus imágenes), luego los simulados
                filteredContent = [
                    ...filteredContent, // Datos reales con imágenes correctas
                    ...simulated.slice(0, Math.max(0, 10 - filteredContent.length)) // Datos simulados solo si es necesario
                ];
            }
            
            // Asegurar que todos los items tengan una imagen válida
            // Si un item real tiene imagen null/undefined, intentar obtenerla de nuevo desde localStorage
            filteredContent = filteredContent.map(item => {
                // Verificar si es simulado
                const isSimulated = item.id?.startsWith('sim-');
                console.log(`🔍 [Carousel] Procesando item:`, {
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    isSimulated: isSimulated,
                    currentImage: item.image,
                    songId: item.songId,
                    albumId: item.albumId
                });
                
                // Si es un item real (no simulado) y no tiene imagen válida, intentar obtenerla
                if (!isSimulated && (!item.image || item.image === '../Assets/default-avatar.png' || item.image === null)) {
                    const contentId = item.songId || item.albumId;
                    console.log(`🔍 [Carousel] Buscando imagen para ${item.type} ${item.id} (contentId: ${contentId})`);
                    
                    // Buscar en localStorage usando el ID del contenido
                    let imageFound = false;
                    for (const review of reviews) {
                        const reviewSongId = review.SongId || review.songId;
                        const reviewAlbumId = review.AlbumId || review.albumId;
                        
                        const matchesContent = (item.type === 'song' && reviewSongId && String(reviewSongId).trim() === String(contentId).trim()) ||
                                             (item.type === 'album' && reviewAlbumId && String(reviewAlbumId).trim() === String(contentId).trim());
                        
                        if (matchesContent) {
                            const reviewId = review.ReviewId || review.reviewId || review.id;
                            if (reviewId) {
                                const storageKey = `review_content_${String(reviewId).trim()}`;
                                const storedData = localStorage.getItem(storageKey);
                                if (storedData) {
                                    try {
                                        const parsed = JSON.parse(storedData);
                                        const storedImage = parsed.image || parsed.Image || parsed.albumImage || parsed.AlbumImage;
                                        if (storedImage && storedImage !== '../Assets/default-avatar.png' && storedImage !== null) {
                                            item.image = storedImage;
                                            imageFound = true;
                                            console.log(`✅ [Carousel] Imagen recuperada para ${item.type} ${item.id} desde review ${reviewId}:`, storedImage);
                                            break; // Encontramos la imagen, no necesitamos seguir buscando
                                        } else {
                                            console.log(`⚠️ [Carousel] Review ${reviewId} tiene imagen por defecto o null:`, storedImage);
                                        }
                                    } catch (e) {
                                        console.error(`❌ [Carousel] Error parseando datos de localStorage para review ${reviewId}:`, e);
                                    }
                                } else {
                                    console.log(`⚠️ [Carousel] No se encontraron datos en localStorage para review ${reviewId}`);
                                }
                            }
                        }
                    }
                    
                    if (!imageFound) {
                        console.log(`❌ [Carousel] No se encontró imagen válida para ${item.type} ${item.id}, usando default`);
                        // Asegurar que al menos tenga la imagen por defecto
                        if (!item.image) {
                            item.image = '../Assets/default-avatar.png';
                        }
                    }
                }
                return item;
            });
            
            // DEBUG: Verificar que las imágenes se mantengan después de filtrar
            console.log(`[Carousel] Contenido final para ${categoryId}:`, filteredContent.map(c => ({
                id: c.id,
                name: c.name,
                image: c.image,
                songId: c.songId,
                albumId: c.albumId,
                type: c.type,
                isReal: !c.id?.startsWith('sim-'),
                reviewsCount: c.reviewsCount
            })));
            
            return filteredContent;
            
        } catch (error) {
            console.error('Error cargando contenido real, usando datos simulados:', error);
            // Si falla, usar datos simulados
            return await generateSimulatedContent(categoryId);
        }
    }
    
    // Función auxiliar para generar contenido simulado (fallback)
    async function generateSimulatedContent(categoryId) {
        const simulatedContent = [];
        const artists = ['Taylor Swift', 'The Weeknd', 'Bad Bunny', 'Billie Eilish', 'Dua Lipa', 'Ed Sheeran', 'Ariana Grande', 'Post Malone', 'Drake', 'The Beatles'];
        const songs = [
            'Love Story', 'Blinding Lights', 'Tití Me Preguntó', 'Bad Guy', 'Levitating', 
            'Shape of You', '7 rings', 'Circles', 'God\'s Plan', 'Hey Jude',
            'Anti-Hero', 'Save Your Tears', 'Me Porto Bonito', 'Everything I Wanted', 'Don\'t Start Now',
            'Perfect', 'Thank U, Next', 'Sunflower', 'In My Feelings', 'Let It Be'
        ];
        
        let count = 10;
        if (categoryId === 'top-50-mes') {
            count = 50;
        }
        
        for (let i = 0; i < count; i++) {
            const randomArtist = artists[Math.floor(Math.random() * artists.length)];
            const randomSong = songs[Math.floor(Math.random() * songs.length)];
            
            let rating = 0;
            let reviewsCount = 0;
            let commentsCount = 0;
            
            switch (categoryId) {
                case 'lo-mas-recomendado':
                    rating = 4 + Math.random() * 1;
                    reviewsCount = 15 + Math.floor(Math.random() * 35);
                    break;
                case 'lo-mas-comentado':
                    rating = 3.5 + Math.random() * 1.5;
                    reviewsCount = 10 + Math.floor(Math.random() * 20);
                    commentsCount = 50 + Math.floor(Math.random() * 150);
                    break;
                case 'top-10-semana':
                    rating = 3.8 + Math.random() * 1.2;
                    reviewsCount = 12 + Math.floor(Math.random() * 28);
                    commentsCount = 30 + Math.floor(Math.random() * 70);
                    break;
                case 'top-50-mes':
                    rating = 3.5 + Math.random() * 1.5;
                    reviewsCount = 8 + Math.floor(Math.random() * 32);
                    commentsCount = 20 + Math.floor(Math.random() * 80);
                    break;
                case 'trending':
                    rating = 3.7 + Math.random() * 1.3;
                    reviewsCount = 5 + Math.floor(Math.random() * 15);
                    commentsCount = 10 + Math.floor(Math.random() * 40);
                    break;
            }
            
            simulatedContent.push({
                id: `sim-${categoryId}-${i}`,
                name: randomSong,
                title: randomSong,
                artist: randomArtist,
                artistName: randomArtist,
                type: 'song',
                rating: rating,
                averageRating: rating,
                reviewsCount: reviewsCount,
                commentsCount: commentsCount,
                image: '../Assets/default-avatar.png'
            });
        }
        
        // Ordenar según la categoría
        switch (categoryId) {
            case 'lo-mas-recomendado':
                simulatedContent.sort((a, b) => b.rating - a.rating);
                break;
            case 'lo-mas-comentado':
                simulatedContent.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
                break;
            case 'trending':
                simulatedContent.sort(() => Math.random() - 0.5);
                break;
            default:
                simulatedContent.sort((a, b) => b.rating - a.rating);
        }
        
        return simulatedContent;
    }
    
    // Función para cerrar modal de contenido del carrusel
    function hideCarouselContentModal() {
        const modal = document.getElementById('carouselContentModalOverlay');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Resetear imagen del header
        const headerImage = document.getElementById('carouselContentHeaderImage');
        if (headerImage) {
            headerImage.src = '../Assets/default-avatar.png';
            headerImage.style.display = 'none';
        }
    }
    
    // Inicializar modales de eliminación (edición ahora es inline)
    // Los event listeners del modal de edición ya no son necesarios
    // ya que la edición ahora es inline
    
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
        deleteCommentModalOverlay.addEventListener('click', function(e) {
            if (e.target === deleteCommentModalOverlay) {
                hideDeleteCommentModal();
            }
        });
    }
    
    // Inicializar modal de eliminación de reseñas
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
        deleteReviewModalOverlay.addEventListener('click', function(e) {
            if (e.target === deleteReviewModalOverlay) {
                hideDeleteReviewModal();
            }
        });
    }
    
    // Permitir enviar con Enter en el textarea de edición
    const editCommentTextarea = document.getElementById('editCommentTextarea');
    if (editCommentTextarea) {
        editCommentTextarea.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                confirmEditComment();
            }
        });
    }
    
    // Inicializar modal de reporte
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
        reportCommentModalOverlay.addEventListener('click', function(e) {
            if (e.target === reportCommentModalOverlay) {
                hideReportCommentModal();
            }
        });
    }
    
    // Habilitar botón de confirmar cuando se selecciona una opción
    if (reportRadios.length > 0) {
        reportRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                const confirmBtn = document.getElementById('confirmReportCommentBtn');
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                }
                
                // Mostrar textarea si se selecciona "Otro"
                if (this.value === 'other' && reportCommentTextarea) {
                    reportCommentTextarea.style.display = 'block';
                } else if (reportCommentTextarea) {
                    reportCommentTextarea.style.display = 'none';
                }
            });
        });
    }
    
    // Agregar algunos comentarios simulados iniciales para demostración
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
    
    // Inicializar comentarios de ejemplo
    //initializeSampleComments();
    

    // Create Review Modal functionality
    let currentReviewData = null; // Store current review data (type, id, name, image)
    
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
            addReviewBtn.addEventListener('click', function() {
                showCreateReviewModal();
            });
        }
        
        if (closeCreateReviewModal) {
            closeCreateReviewModal.addEventListener('click', hideCreateReviewModal);
        }
        
        if (createReviewModalOverlay) {
            createReviewModalOverlay.addEventListener('click', function(e) {
                if (e.target === createReviewModalOverlay) {
                    hideCreateReviewModal();
                }
            });
        }
        
        if (submitCreateReviewBtn) {
            submitCreateReviewBtn.addEventListener('click', function(e) {
                console.log('🔘 Botón de crear reseña clickeado');
                e.preventDefault();
                submitCreateReview();
            });
        } else {
            console.error('❌ No se encontró el botón submitCreateReviewBtn');
        }
        
        if (changeContentBtn) {
            changeContentBtn.addEventListener('click', function() {
                // Volver al selector de búsqueda
                const contentSelector = document.getElementById('createReviewContentSelector');
                const contentInfo = document.getElementById('createReviewContentInfo');
                if (contentSelector) contentSelector.style.display = 'block';
                if (contentInfo) contentInfo.style.display = 'none';
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
                    searchTimeout = setTimeout(() => {
                        performContentSearch(this.value.trim());
                    }, 500);
                } else {
                    if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
                }
            });
            
            // Cerrar dropdown al hacer clic fuera
            document.addEventListener('click', function(e) {
                if (!contentSearchInput.contains(e.target) && 
                    !contentSearchDropdown.contains(e.target)) {
                    if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
                }
            });
            
            async function performContentSearch(query) {
                if (!query || query.length === 0) {
                    if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
                    return;
                }
                
                if (contentSearchDropdown) {
                    contentSearchDropdown.innerHTML = '<div class="search-loading">Buscando...</div>';
                    contentSearchDropdown.style.display = 'block';
                }
                
                currentSearchController = new AbortController();
                
                try {
                    // URL del Gateway (puerto 5000) - ruta configurada en el gateway
                    const GATEWAY_BASE_URL = 'http://localhost:5000';
                    const response = await axios.get(`${GATEWAY_BASE_URL}/api/gateway/contents/search`, {
                        params: { query: query },
                        signal: currentSearchController.signal,
                        timeout: 5000
                    });
                    const results = response.data;
                    displayContentSearchResults(results, query);
                } catch (error) {
                    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
                        return;
                    }
                    console.error('Error en la búsqueda:', error);
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
            
            function displayContentSearchResults(results, query) {
                console.log('🔍 Resultados de búsqueda recibidos:', results);
                // Eliminar artistas - no se pueden crear reseñas de artistas
                const albums = results.Albums || results.albums || [];
                const songs = results.Songs || results.songs || [];
                
                console.log('📦 Canciones encontradas:', songs.length);
                console.log('📦 Álbumes encontrados:', albums.length);
                
                // Log de la primera canción para ver su estructura
                if (songs.length > 0) {
                    console.log('🎵 Primera canción (estructura completa):', songs[0]);
                }
                if (albums.length > 0) {
                    console.log('💿 Primer álbum (estructura completa):', albums[0]);
                }
                
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
                        // El ID real está en apiSongId (no en songId que es un GUID vacío)
                        const songId = song.apiSongId || song.APISongId || song.APIId || song.apiId || song.Id || song.id || song.SongId || song.songId || '';
                        const songTitle = song.Title || song.title || song.Name || song.name || '';
                        const songImage = song.Image || song.image || song.AlbumImage || song.albumImage || '../Assets/default-avatar.png';
                        const artistName = song.ArtistName || song.artistName || song.Artist || song.artist || '';
                        // Formato estilo Spotify: "Canción • Artista"
                        const subtitle = artistName ? `Canción • ${artistName}` : 'Canción';
                        
                        // Log para depuración
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
                        // El ID real está en apiAlbumId (no en albumId que es un GUID vacío)
                        const albumId = album.apiAlbumId || album.APIAlbumId || album.Id || album.id || album.AlbumId || album.albumId || '';
                        const albumTitle = album.Title || album.title || album.Name || album.name || '';
                        const albumImage = album.Image || album.image || '../Assets/default-avatar.png';
                        const artistName = album.ArtistName || album.artistName || album.Artist || album.artist || '';
                        // Formato estilo Spotify: "Álbum • Artista"
                        const subtitle = artistName ? `Álbum • ${artistName}` : 'Álbum';
                        
                        // Log para depuración
                        if (!albumId) {
                            console.warn('⚠️ Álbum sin ID:', album);
                        }
                        
                        html += `
                            <div class="content-search-item" data-type="album" data-id="${albumId}" data-name="${albumTitle}" data-image="${albumImage}" data-artist="${artistName}">
                                <img src="${albumImage}" alt="${albumTitle}" class="content-search-item-image" onerror="this.src='../Assets/default-avatar.png'">
                                <div class="content-search-item-text">
                                    <div class="content-search-item-name">${albumTitle}</div>
                                    <div class="content-search-item-type">${subtitle}</div>
                                </div>
                                <i class="fas fa-plus content-search-item-icon"></i>
                            </div>
                        `;
                    });
                }
                
                if (contentSearchDropdown) {
                    contentSearchDropdown.innerHTML = html;
                    contentSearchDropdown.style.display = 'block';
                    
                    // Agregar event listeners
                    contentSearchDropdown.querySelectorAll('.content-search-item').forEach(item => {
                        item.addEventListener('click', function() {
                            const contentType = this.getAttribute('data-type');
                            
                            // Validar que no sea artista
                            if (contentType === 'artist') {
                                showAlert('No se pueden crear reseñas de artistas. Por favor, selecciona una canción o un álbum.', 'warning');
                                return;
                            }
                            
                            const contentId = this.getAttribute('data-id');
                            const contentName = this.getAttribute('data-name');
                            const contentImage = this.getAttribute('data-image');
                            const contentArtist = this.getAttribute('data-artist') || '';
                            
                            console.log('🎵 Contenido seleccionado:', {
                                type: contentType,
                                id: contentId,
                                name: contentName,
                                image: contentImage,
                                artist: contentArtist
                            });
                            
                            if (!contentId || contentId === '00000000-0000-0000-0000-000000000000' || contentId.trim() === '') {
                                console.error('❌ Error: El ID del contenido está vacío o es un GUID vacío');
                                console.error('ID recibido:', contentId);
                                showAlert('Error: No se pudo obtener el ID del contenido. El backend no está devolviendo un ID válido. Por favor, intenta con otro contenido.', 'warning');
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
                            if (contentSearchInput) contentSearchInput.value = contentData.name;
                        });
                    });
                }
            }
        }
        
        // Initialize star rating (full stars only)
        if (createReviewStars) {
            const stars = createReviewStars.querySelectorAll('.star-input');
            let currentRating = 0;
            
            stars.forEach((star, index) => {
                star.addEventListener('click', function() {
                    currentRating = parseInt(this.getAttribute('data-rating'));
                    updateStarRating(currentRating);
                });
                
                star.addEventListener('mouseenter', function() {
                    const hoverRating = parseInt(this.getAttribute('data-rating'));
                    highlightStars(hoverRating);
                });
            });
            
            createReviewStars.addEventListener('mouseleave', function() {
                highlightStars(currentRating);
            });
            
            function updateStarRating(rating) {
                currentRating = rating;
                highlightStars(rating);
            }
            
            function highlightStars(rating) {
                stars.forEach((star, index) => {
                    if (index < rating) {
                        star.classList.add('active');
                    } else {
                        star.classList.remove('active');
                    }
                });
            }
        }
    }
    
    function showCreateReviewModal(contentData = null) {
        // contentData: { type: 'song'|'album', id: string, name: string, image: string }
        // Nota: No se aceptan artistas
        const modal = document.getElementById('createReviewModalOverlay');
        const contentSelector = document.getElementById('createReviewContentSelector');
        const contentInfo = document.getElementById('createReviewContentInfo');
        const contentSearchInput = document.getElementById('contentSearchInput');
        const contentSearchDropdown = document.getElementById('contentSearchDropdown');
        
        if (!modal) return;
        
        // Validar que no sea artista si se proporciona contenido
        if (contentData && contentData.type === 'artist') {
            showAlert('No se pueden crear reseñas de artistas. Por favor, selecciona una canción o un álbum.', 'warning');
            return;
        }
        
        // Si se proporciona contenido, mostrarlo directamente
        if (contentData) {
            setSelectedContent(contentData);
        } else {
            // Sin contenido: mostrar selector de búsqueda
            currentReviewData = null;
            if (contentSelector) contentSelector.style.display = 'block';
            if (contentInfo) contentInfo.style.display = 'none';
            if (contentSearchInput) contentSearchInput.value = '';
            if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
        }
        
        // Resetear formulario
        const titleInput = document.getElementById('createReviewTitleInput');
        const textInput = document.getElementById('createReviewTextInput');
        if (titleInput) titleInput.value = '';
        if (textInput) textInput.value = '';
        
        // Resetear estrellas
        const stars = document.querySelectorAll('.star-input');
        stars.forEach(star => {
            star.classList.remove('active');
        });
        
        modal.style.display = 'flex';
    }
    
    function setSelectedContent(contentData) {
        // Validar que no sea un artista (no se pueden crear reseñas de artistas)
        // Esta validación solo aplica dentro del modal de crear reseña
        if (contentData && contentData.type === 'artist') {
            showAlert('No se pueden crear reseñas de artistas. Por favor, selecciona una canción o un álbum.', 'warning');
            return;
        }
        
        currentReviewData = contentData;
        
        const contentSelector = document.getElementById('createReviewContentSelector');
        const contentInfo = document.getElementById('createReviewContentInfo');
        const contentInfoImage = document.getElementById('contentInfoImage');
        const contentInfoName = document.getElementById('contentInfoName');
        const contentInfoType = document.getElementById('contentInfoType');
        const contentSearchDropdown = document.getElementById('contentSearchDropdown');
        
        // Ocultar selector, mostrar info
        if (contentSelector) contentSelector.style.display = 'none';
        if (contentInfo) contentInfo.style.display = 'flex';
        if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
        
        // Configurar imagen
        if (contentInfoImage) {
            contentInfoImage.src = contentData.image || '../Assets/default-avatar.png';
            contentInfoImage.onerror = function() {
                this.src = '../Assets/default-avatar.png';
            };
        }
        
        // Configurar nombre
        if (contentInfoName) {
            contentInfoName.textContent = contentData.name || 'Nombre';
        }
        
        // Configurar tipo
        if (contentInfoType) {
            const typeText = contentData.type === 'artist' ? 'ARTISTA' : 
                            contentData.type === 'album' ? 'ÁLBUM' : 'CANCIÓN';
            contentInfoType.textContent = typeText;
        }
        
        // Ajustar estilo según tipo
        if (contentInfo) {
            if (contentData.type === 'artist') {
                contentInfo.classList.add('content-info-artist');
                if (contentInfoImage) {
                    contentInfoImage.style.borderRadius = '50%';
                }
            } else {
                contentInfo.classList.remove('content-info-artist');
                if (contentInfoImage) {
                    contentInfoImage.style.borderRadius = '8px';
                }
            }
        }
    }
    
    function hideCreateReviewModal() {
        const modal = document.getElementById('createReviewModalOverlay');
        if (modal) {
            modal.style.display = 'none';
            // Limpiar atributo de edición si existe
            modal.removeAttribute('data-edit-review-id');
            // Restaurar título del modal
            const modalTitle = modal.querySelector('.create-review-title');
            if (modalTitle) {
                modalTitle.textContent = 'Crear Reseña';
            }
        }
        currentReviewData = null;
    }
    
    async function submitCreateReview() {
        console.log('📝 Función submitCreateReview llamada');
        const authToken = localStorage.getItem('authToken');
        console.log('🔑 Token encontrado:', authToken ? 'Sí' : 'No');
        if (!authToken) {
            console.warn('⚠️ No hay token de autenticación');
            showLoginRequiredModal();
            return;
        }
        
        console.log('📦 currentReviewData:', currentReviewData);
        if (!currentReviewData) {
            console.warn('⚠️ No hay contenido seleccionado');
            showAlert('Por favor, selecciona el contenido a reseñar', 'warning');
            return;
        }
        
        const titleInput = document.getElementById('createReviewTitleInput');
        const textInput = document.getElementById('createReviewTextInput');
        const createReviewStars = document.getElementById('createReviewStars');
        
        console.log('📝 Inputs encontrados:', {
            titleInput: !!titleInput,
            textInput: !!textInput,
            createReviewStars: !!createReviewStars
        });
        
        const title = titleInput ? titleInput.value.trim() : '';
        const content = textInput ? textInput.value.trim() : '';
        
        console.log('📄 Datos del formulario:', { title, contentLength: content.length });
        
        // Calcular rating basado en estrellas activas (solo estrellas completas)
        let rating = 0;
        if (createReviewStars) {
            const stars = createReviewStars.querySelectorAll('.star-input');
            console.log('⭐ Estrellas encontradas:', stars.length);
            stars.forEach((star) => {
                if (star.classList.contains('active')) {
                    const starRating = parseInt(star.getAttribute('data-rating'));
                    if (starRating > rating) {
                        rating = starRating;
                    }
                }
            });
        }
        
        console.log('⭐ Rating calculado:', rating);
        
        if (!title) {
            console.warn('⚠️ Título vacío');
            showAlert('Por favor, ingresa un título para la reseña', 'warning');
            return;
        }
        
        if (!content) {
            console.warn('⚠️ Contenido vacío');
            showAlert('Por favor, escribe tu reseña', 'warning');
            return;
        }
        
        if (rating === 0) {
            console.warn('⚠️ Rating no seleccionado');
            showAlert('Por favor, selecciona una calificación', 'warning');
            return;
        }
        
        console.log('✅ Validaciones pasadas, preparando datos...');
        
        const userId = localStorage.getItem('userId');
        const GATEWAY_BASE_URL = 'http://localhost:5000';
        
        console.log('👤 UserId:', userId);
        console.log('🌐 Gateway URL:', GATEWAY_BASE_URL);
        
        // Verificar si es una edición
        const modal = document.getElementById('createReviewModalOverlay');
        const editReviewId = modal ? modal.getAttribute('data-edit-review-id') : null;
        const isEdit = !!editReviewId;
        
        if (isEdit) {
            console.log('✏️ Modo edición detectado. ReviewId:', editReviewId);
            // Para editar, no necesitamos obtener el contentGuid de nuevo
            try {
                const reviewData = {
                    UserId: String(userId).trim(),
                    Rating: rating,
                    Title: title,
                    Content: content
                };
                
                // Si es modo desarrollo, simular
                if (authToken.startsWith('dev-token-')) {
                    console.warn('⚠️ MODO DESARROLLO: La edición NO se guardará en el backend');
                    showAlert('✅ Reseña editada exitosamente (modo desarrollo)', 'success');
                    hideCreateReviewModal();
                    if (typeof loadReviews === 'function') {
                        await loadReviews();
                    }
                    return;
                }
                
                // Enviar PUT al backend
                console.log('📤 Editando reseña:', reviewData);
                const response = await axios.put(`${GATEWAY_BASE_URL}/api/gateway/reviews/${editReviewId}`, reviewData, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                });
                
                if (response.status === 200) {
                    console.log('✅ Reseña editada exitosamente');
                    showAlert('✅ Reseña editada exitosamente', 'success');
                    hideCreateReviewModal();
                    
                    // Limpiar el atributo de edición
                    if (modal) modal.removeAttribute('data-edit-review-id');
                    
                    // Recargar reseñas
                    if (typeof loadReviews === 'function') {
                        await loadReviews();
                    }
                } else {
                    throw new Error('Respuesta inesperada del servidor');
                }
            } catch (error) {
                console.error('❌ Error editando reseña:', error);
                if (error.response) {
                    const status = error.response.status;
                    const message = error.response.data?.message || error.response.data?.Message || 'Error desconocido';
                    if (status === 401) {
                        showAlert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'warning');
                        setTimeout(() => {
                            window.location.href = 'login.html';
                        }, 2000);
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
            return; // Salir temprano si es edición
        }
        
        try {
            // Validar que se haya seleccionado contenido (solo para creación)
            console.log('🔍 Validando currentReviewData...');
            if (!currentReviewData || !currentReviewData.id) {
                console.error('❌ currentReviewData inválido:', currentReviewData);
                showAlert('Error: No se seleccionó contenido. Por favor, selecciona una canción o álbum.', 'warning');
                return;
            }
            
            // Validar que el ID no sea un GUID vacío
            if (currentReviewData.id === '00000000-0000-0000-0000-000000000000' || currentReviewData.id.trim() === '') {
                console.error('❌ Error: El ID del contenido es un GUID vacío');
                console.error('currentReviewData completo:', currentReviewData);
                showAlert('Error: El contenido seleccionado no tiene un ID válido. El backend no está devolviendo el ID correctamente. Por favor, intenta con otro contenido o verifica la respuesta del API.', 'warning');
                return;
            }
            
            console.log('✅ Contenido válido:', currentReviewData);
            
            // Primero necesitamos obtener el SongId o AlbumId (Guid) del Content Service
            // usando el apiSongId o apiAlbumId (string de Spotify)
            let contentGuid = null;
            
            try {
                if (currentReviewData.type === 'song') {
                    console.log('🔍 Obteniendo SongId (Guid) para apiSongId:', currentReviewData.id);
                    // Llamar al Content Service para obtener o crear la canción y obtener su SongId
                    // NOTA: El gateway usa /song (singular), no /songs (plural)
                    try {
                        const songResponse = await axios.post(`${GATEWAY_BASE_URL}/api/gateway/contents/song`, {
                            APISongId: currentReviewData.id
                        }, {
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            timeout: 10000
                        });
                        
                        console.log('📦 Respuesta completa del POST:', songResponse);
                        console.log('📦 songResponse.data:', songResponse.data);
                        console.log('📦 songResponse.data.SongId:', songResponse.data?.SongId);
                        console.log('📦 songResponse.data.songId:', songResponse.data?.songId);
                        
                        // El backend devuelve 'songId' (minúscula), no 'SongId' (mayúscula)
                        // Intentamos ambas versiones para ser compatibles
                        const songId = songResponse.data?.SongId || songResponse.data?.songId;
                        
                        if (songResponse.data && songId) {
                            contentGuid = songId;
                            console.log('✅ SongId obtenido del POST:', contentGuid);
                        } else {
                            console.error('❌ La respuesta no tiene SongId. Respuesta completa:', songResponse.data);
                            throw new Error('No se pudo obtener el SongId del Content Service');
                        }
                    } catch (postError) {
                        console.error('❌ Error en POST:', postError);
                        console.error('❌ postError.response:', postError.response);
                        console.error('❌ postError.response?.status:', postError.response?.status);
                        console.error('❌ postError.response?.data:', postError.response?.data);
                        
                        // Si el POST falla con 500, puede ser que la canción se creó pero el CreatedAtAction falló
                        // Intentamos obtener la canción con GET (Get-or-Create)
                        if (postError.response && postError.response.status === 500) {
                            console.warn('⚠️ POST falló con 500, intentando GET como fallback...');
                            try {
                                const getResponse = await axios.get(`${GATEWAY_BASE_URL}/api/gateway/contents/song/${currentReviewData.id}`, {
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    timeout: 10000
                                });
                                
                                console.log('📦 Respuesta completa del GET:', getResponse);
                                console.log('📦 getResponse.data:', getResponse.data);
                                
                                // El backend devuelve 'songId' (minúscula), no 'SongId' (mayúscula)
                                // Intentamos ambas versiones para ser compatibles
                                const songId = getResponse.data?.SongId || getResponse.data?.songId;
                                
                                if (getResponse.data && songId) {
                                    contentGuid = songId;
                                    console.log('✅ SongId obtenido del GET (fallback):', contentGuid);
                                } else {
                                    console.error('❌ La respuesta GET no tiene SongId. Respuesta completa:', getResponse.data);
                                    throw new Error('No se pudo obtener el SongId ni con POST ni con GET');
                                }
                            } catch (getError) {
                                console.error('❌ Error en GET fallback:', getError);
                                throw new Error('No se pudo obtener el SongId ni con POST ni con GET');
                            }
                        } else {
                            throw postError;
                        }
                    }
                } else if (currentReviewData.type === 'album') {
                    console.log('🔍 Obteniendo AlbumId (Guid) para apiAlbumId:', currentReviewData.id);
                    // Llamar al Content Service para obtener o crear el álbum y obtener su AlbumId
                    // NOTA: GetAlbumById tiene lógica Get-or-Create, así que usamos GET en lugar de POST
                    const albumResponse = await axios.get(`${GATEWAY_BASE_URL}/api/gateway/contents/album/${currentReviewData.id}`, {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });
                    
                    console.log('📦 Respuesta completa del GET (álbum):', albumResponse);
                    console.log('📦 albumResponse.data:', albumResponse.data);
                    console.log('📦 albumResponse.data.AlbumId:', albumResponse.data?.AlbumId);
                    console.log('📦 albumResponse.data.albumId:', albumResponse.data?.albumId);
                    
                    // El backend puede devolver 'AlbumId' (mayúscula) o 'albumId' (minúscula)
                    const albumId = albumResponse.data?.AlbumId || albumResponse.data?.albumId;
                    
                    if (albumResponse.data && albumId) {
                        contentGuid = albumId;
                        console.log('✅ AlbumId obtenido:', contentGuid);
                    } else {
                        console.error('❌ La respuesta no tiene AlbumId. Respuesta completa:', albumResponse.data);
                        throw new Error('No se pudo obtener el AlbumId del Content Service');
                    }
                } else {
                    showAlert('Error: Tipo de contenido no válido. Solo se pueden crear reseñas de canciones o álbumes.', 'warning');
                    return;
                }
            } catch (error) {
                console.error('❌ Error obteniendo Guid del Content Service:', error);
                const errorMsg = error.response?.data?.message || error.message || 'Error al obtener el ID del contenido';
                showAlert(`Error: ${errorMsg}. Por favor, intenta nuevamente.`, 'danger');
                return;
            }
            
            if (!contentGuid) {
                showAlert('Error: No se pudo obtener el ID del contenido. Por favor, intenta nuevamente.', 'warning');
                return;
            }
            
            // Preparar datos según el tipo con el Guid correcto
            // Asegurar que UserId sea un string válido (el backend lo convertirá a Guid)
            // Asegurar que contentGuid sea un string válido (el backend lo convertirá a Guid)
            const reviewData = {
                UserId: String(userId).trim(),
                Rating: rating,
                Title: title,
                Content: content
            };
            
            if (currentReviewData.type === 'song') {
                reviewData.SongId = String(contentGuid).trim();
                console.log('📝 Creando reseña para canción:', currentReviewData.name, 'SongId (Guid):', reviewData.SongId);
            } else if (currentReviewData.type === 'album') {
                reviewData.AlbumId = String(contentGuid).trim();
                console.log('📝 Creando reseña para álbum:', currentReviewData.name, 'AlbumId (Guid):', reviewData.AlbumId);
            }
            
            // Si es modo desarrollo, simular
            if (authToken.startsWith('dev-token-')) {
                console.warn('⚠️ MODO DESARROLLO: La reseña NO se guardará en el backend');
                console.log('✅ Reseña simulada creada (modo desarrollo):', reviewData);
                
                // Simular éxito para mejor UX mientras esperan el backend
                showAlert('✅ Reseña creada exitosamente (modo desarrollo - no se guardó en el backend)', 'success');
                hideCreateReviewModal();
                
                // Recargar reseñas y carrusel para mantener la consistencia de la UI
                if (typeof loadReviews === 'function') {
                    await loadReviews();
                }
                
                // Recargar carrusel para actualizar datos (lo más comentado, top de la semana, etc.)
                if (typeof window.reloadCarousel === 'function') {
                    await window.reloadCarousel();
                }
                
                setTimeout(() => {
                    showAlert('⚠️ Nota: Esta reseña es solo una simulación. Cuando el backend esté listo, haz login real para guardar reseñas.', 'info');
                }, 500);
                return;
            }
            
            // Enviar al backend a través del gateway
            console.log('📤 Enviando reseña al backend:', reviewData);
            const response = await axios.post(`${GATEWAY_BASE_URL}/api/gateway/reviews`, reviewData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            
            // Verificar que la respuesta sea exitosa
            if (response.status === 201 || response.status === 200) {
                // Normalizar el reviewId (puede venir como GUID, string, etc.)
                let reviewId = response.data?.ReviewId || response.data?.reviewId || response.data?.Id_Review || response.data?.id || 'N/A';
                if (reviewId && reviewId !== 'N/A') {
                    // Convertir a string y normalizar
                    reviewId = String(reviewId).trim();
                }
                
                console.log('✅ Reseña guardada exitosamente en el backend');
                console.log('🆔 ID de la reseña (normalizado):', reviewId);
                console.log('📝 Datos enviados:', reviewData);
                console.log('📦 Respuesta completa del servidor:', response.data);
            
                // Guardar los datos del contenido en localStorage para poder mostrarlos después
                if (reviewId && reviewId !== 'N/A' && currentReviewData) {
                    const contentDataToStore = {
                        type: currentReviewData.type,
                        name: currentReviewData.name || '',
                        artist: currentReviewData.artist || '',
                        id: currentReviewData.id || '',
                        image: currentReviewData.image || '../Assets/default-avatar.png'
                    };
                    const storageKey = `review_content_${reviewId}`;
                    localStorage.setItem(storageKey, JSON.stringify(contentDataToStore));
                    console.log(`💾 Datos del contenido guardados en localStorage con clave: ${storageKey}`, contentDataToStore);
                    
                    // Verificar que se guardó correctamente
                    const verify = localStorage.getItem(storageKey);
                    if (verify) {
                        console.log('✅ Verificación: Datos guardados correctamente en localStorage');
                    } else {
                        console.error('❌ Error: No se pudieron guardar los datos en localStorage');
                    }
                } else {
                    console.warn('⚠️ No se pudieron guardar los datos del contenido:', { reviewId, hasCurrentReviewData: !!currentReviewData });
                }
            
                showAlert('✅ Reseña creada y guardada exitosamente', 'success');
            hideCreateReviewModal();
            
                // Cambiar automáticamente a "RECIENTES" para que el usuario vea su nueva reseña
                if (currentReviewFilter !== 'recent') {
                    console.log('🔄 Cambiando a filtro "RECIENTES" para mostrar la nueva reseña');
                    setReviewFilter('recent');
                } else {
                    // Si ya está en "RECIENTES", solo recargar
                    console.log('🔄 Recargando lista de reseñas (ya en RECIENTES)');
                    if (typeof loadReviews === 'function') {
                        await loadReviews();
                    }
                }
                
                // Recargar carrusel para actualizar datos (lo más comentado, top de la semana, etc.)
                if (typeof window.reloadCarousel === 'function') {
                    await window.reloadCarousel();
                }
                
                // Mostrar mensaje adicional después de recargar
                setTimeout(() => {
                    showAlert('Tu reseña ya está visible en la lista', 'info');
                }, 500);
            } else {
                throw new Error('Respuesta inesperada del servidor');
            }
        } catch (error) {
            console.error('❌ Error creando reseña:', error);
            
            if (error.response) {
                // Error del servidor con respuesta
                const status = error.response.status;
                const message = error.response.data?.message || error.response.data?.Message || 'Error desconocido';
                console.error(`Error del servidor (${status}):`, message);
                
                // Manejar error 409 (Conflict) - Ya existe una reseña
                if (status === 409) {
                    const contentType = currentReviewData?.type === 'song' ? 'canción' : 'álbum';
                    const contentName = currentReviewData?.name || 'este contenido';
                    showAlert(`Ya creaste una reseña de esta ${contentType}. Si quieres cambiarla, ve al botón editar de la reseña.`, 'warning');
                    hideCreateReviewModal();
                    
                    // Recargar reseñas para mostrar la existente
                    if (typeof loadReviews === 'function') {
                        setTimeout(() => {
                            loadReviews();
                        }, 1000);
                    }
                } else if (status === 401) {
                    showAlert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'warning');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else if (status === 403) {
                    showAlert('No tienes permisos para realizar esta acción.', 'danger');
                } else {
                    showAlert(`Error al crear la reseña: ${message}`, 'danger');
                }
            } else if (error.request) {
                // No se pudo conectar al servidor
                console.error('No se pudo conectar al servidor');
                showAlert('No se pudo conectar al servidor. Verifica tu conexión.', 'danger');
            } else {
                // Error inesperado
                console.error('Error inesperado:', error.message);
                showAlert('Error al crear la reseña. Intenta nuevamente.', 'danger');
            }
        }
    }
    
    // Initialize create review modal
    //initializeCreateReviewModal();

    // Alert helper function
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

    // Logout modal functionality
    function initializeLogoutModal() {
        const logoutModalOverlay = document.getElementById('logoutModalOverlay');
        const logoutModalTitle = document.getElementById('logoutModalTitle');
        const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
        const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
        
        // Confirm logout handler
        confirmLogoutBtn.addEventListener('click', function() {
            // Detener polling de notificaciones
            stopNotificationPolling();
            
            // Limpiar estado de notificaciones
            userReviewsState = {};
            notifications = [];
            
            // Clear local storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('userId');
            localStorage.removeItem('username');
            
            // Redirect to login
            window.location.href = 'login.html';
        });
        
        // Cancel logout handler
        cancelLogoutBtn.addEventListener('click', function() {
            logoutModalOverlay.style.display = 'none';
        });
        
        // Close modal when clicking outside
        logoutModalOverlay.addEventListener('click', function(e) {
            if (e.target === logoutModalOverlay) {
                logoutModalOverlay.style.display = 'none';
            }
        });
    }
    
    function showLogoutModal() {
        const logoutModalOverlay = document.getElementById('logoutModalOverlay');
        const logoutModalTitle = document.getElementById('logoutModalTitle');
        
        // Get username from localStorage
        const username = localStorage.getItem('username') || 'Usuario';
        logoutModalTitle.textContent = `¿Salir de ${username}?`;
        
        // Show modal
        logoutModalOverlay.style.display = 'flex';
    }
    
    // Initialize logout modal on page load
    //initializeLogoutModal();
});

