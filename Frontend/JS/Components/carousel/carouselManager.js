/**
 * Módulo principal del carrusel
 * Inicializa y gestiona el carrusel de rankings
 */

import { loadCarouselData } from './carouselData.js';
import { loadCarouselContent, showCarouselContentModal } from './carouselContent.js';

/**
 * Inicializa el carrusel de rankings
 */
export function initializeCarousel() {
    const carouselWrapper = document.getElementById('carouselWrapper');
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    const indicatorsContainer = document.getElementById('carouselIndicators');

    // Define different "tops" categories con descripciones dinámicas
    const carouselTops = [
        {
            id: 'lo-mas-recomendado',
            title: 'LO MÁS RECOMENDADO',
            description: 'Basado en promedio de estrellas ponderado',
            text: 'Canciones u álbumes con mejores calificaciones',
            getDescription: (data) => {
                if (data && data.topSong && data.topSong.totalReviews > 0) {
                    return 'Contenido con las mejores calificaciones promedio de la comunidad';
                }
                return 'Contenido con las mejores calificaciones promedio de la comunidad';
            }
        },
        {
            id: 'lo-mas-comentado',
            title: 'LO MÁS COMENTADO',
            description: 'Más interacción en comentarios',
            text: 'Canciones u álbumes con mayor cantidad total de comentarios en sus reseñas',
            getDescription: (data) => {
                if (data && data.topSong && data.topSong.totalComments > 0) {
                    return `${data.topSong.totalComments} comentario${data.topSong.totalComments !== 1 ? 's' : ''} en ${data.topSong.totalReviews} reseña${data.topSong.totalReviews !== 1 ? 's' : ''}`;
                }
                return 'Más interacción en comentarios';
            }
        },
        {
            id: 'top-10-semana',
            title: 'TOP 10 DE LA SEMANA',
            description: 'Ranking semanal combinado',
            text: 'Top 10 basado en calificaciones, comentarios y likes',
            getDescription: (data) => {
                if (data && data.topSong && data.topSong.avgRating !== undefined) {
                    const avgRating = data.topSong.avgRating ? data.topSong.avgRating.toFixed(1) : '0.0';
                    const comments = data.topSong.totalComments || 0;
                    const likes = data.topSong.totalLikes || 0;
                    return `${avgRating} ⭐ • ${comments} comentario${comments !== 1 ? 's' : ''} • ${likes} like${likes !== 1 ? 's' : ''} • Esta semana`;
                }
                return 'Ranking semanal combinado';
            }
        },
        {
            id: 'top-50-mes',
            title: 'TOP 50 DEL MES',
            description: 'Ranking mensual combinado',
            text: 'Top 50 basado en calificaciones, comentarios y likes',
            getDescription: (data) => {
                if (data && data.topSong && data.topSong.avgRating !== undefined) {
                    const avgRating = data.topSong.avgRating ? data.topSong.avgRating.toFixed(1) : '0.0';
                    const comments = data.topSong.totalComments || 0;
                    const likes = data.topSong.totalLikes || 0;
                    return `${avgRating} ⭐ • ${comments} comentario${comments !== 1 ? 's' : ''} • ${likes} like${likes !== 1 ? 's' : ''} • Este mes`;
                }
                return 'Ranking mensual combinado';
            }
        },
        {
            id: 'trending',
            title: 'TRENDING',
            description: 'Mayor crecimiento reciente',
            text: 'Canciones u álbumes con mayor crecimiento de actividad del día',
            getDescription: (data) => {
                if (data && data.topSong && data.topSong.growthRate !== undefined) {
                    const recentReviews = data.topSong.recentReviews || 0;
                    return `+${recentReviews} reseña${recentReviews !== 1 ? 's' : ''} en las últimas 24h • +${data.topSong.growthRate}% crecimiento`;
                }
                return 'Mayor crecimiento reciente';
            }
        }
    ];

    let currentIndex = 0;
    let carouselData = null;

    /**
     * Función para obtener la URL de la imagen (siempre usar imágenes locales de Assets en la vista previa)
     */
    function getCarouselImageUrl(categoryId, categoryTitle, data) {
        // Siempre usar imágenes locales de Assets según la categoría (no usar imágenes reales del contenido)
        const categoryImages = {
            'lo-mas-recomendado': '../Assets/LoMasRecomendado.png',
            'lo-mas-comentado': '../Assets/LoMasComentado.png',
            'top-10-semana': '../Assets/Top10semana.png',
            'top-50-mes': '../Assets/Top50mes.png',
            'trending': '../Assets/Trending.png'
        };

        // Si hay una imagen local para esta categoría, usarla
        if (categoryImages[categoryId]) {
            return categoryImages[categoryId];
        }

        // Último fallback: imagen por defecto
        return '../Assets/default-avatar.png';
    }

    // Create carousel items
    async function createCarouselItems() {
        console.log('🎠 createCarouselItems: Iniciando creación de items del carrusel...');
        carouselWrapper.innerHTML = '';
        indicatorsContainer.innerHTML = '';

        // Cargar datos dinámicos
        console.log('🎠 createCarouselItems: Cargando datos...');
        carouselData = await loadCarouselData();
        console.log('🎠 createCarouselItems: Datos cargados:', carouselData ? 'OK' : 'NULL');

        carouselTops.forEach((top, index) => {
            // Obtener datos específicos para esta categoría
            const data = carouselData ? carouselData[top.id] : null;
            console.log(`🎠 createCarouselItems: Procesando ${top.id}:`, data ? 'tiene datos' : 'sin datos');
            const description = top.getDescription ? top.getDescription(data) : top.description;
            
            // Obtener URL de imagen local de Assets según la categoría
            const categoryImages = {
                'lo-mas-recomendado': '../Assets/LoMasRecomendado.png',
                'lo-mas-comentado': '../Assets/LoMasComentado.png',
                'top-10-semana': '../Assets/Top10semana.png',
                'top-50-mes': '../Assets/Top50mes.png',
                'trending': '../Assets/Trending.png'
            };
            
            // Usar imagen local de Assets como imagen base (siempre usar Assets en el carrusel principal)
            let imageUrl = categoryImages[top.id] || '../Assets/default-avatar.png';
            
            // NO usar imágenes reales del contenido en el carrusel principal, solo en el modal

            // Create carousel item
            const item = document.createElement('div');
            item.className = `carousel-item ${index === 0 ? 'active' : ''}`;
            item.setAttribute('data-top', top.id);
            item.style.cursor = 'pointer';
            
            // Guardar la imagen local como fallback
            const fallbackImage = categoryImages[top.id] || '../Assets/default-avatar.png';
            
            item.innerHTML = `
                <div class="carousel-card">
                    <div class="carousel-album-art">
                        <img src="${imageUrl}" 
                            alt="${top.title}" 
                            class="album-image"
                            onerror="this.onerror=null; this.src='${fallbackImage}'">
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
            
            // NO reemplazar la imagen de Assets con imágenes reales del contenido
            // La vista previa del carrusel siempre debe usar las imágenes de Assets

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
            goToSlide(0);
            startAutoPlay();
            console.log('✅ Carrusel recargado exitosamente');
        } catch (error) {
            console.error('❌ Error recargando carrusel:', error);
        }
    };

    // Initialize carousel (async)
    createCarouselItems().then(() => {
        console.log('🎠 initializeCarousel: Carrusel creado exitosamente');
        const itemsCount = carouselWrapper.querySelectorAll('.carousel-item').length;
        console.log('🎠 initializeCarousel: Items creados:', itemsCount);
        if (itemsCount === 0) {
            console.warn('⚠️ initializeCarousel: No se crearon items en el carrusel');
        }
        startAutoPlay();
    }).catch(error => {
        console.error('❌ Error inicializando carrusel:', error);
        console.error('❌ Stack trace:', error.stack);
        startAutoPlay();
    });
}

