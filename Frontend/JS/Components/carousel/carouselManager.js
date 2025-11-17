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
            text: 'Canciones con mejores calificaciones (mínimo 10 reseñas)',
            getDescription: (data) => {
                if (data && data.topSong) {
                    if (data.topSong.totalReviews > 0) {
                        const reviewsText = data.topSong.totalReviews === 1 ? 'reseña' : 'reseñas';
                        const avgRating = data.topSong.avgRating ? data.topSong.avgRating.toFixed(1) : '0.0';
                        return `${data.topSong.totalReviews} ${reviewsText} • Promedio ${avgRating} estrellas`;
                    } else {
                        return 'Crea reseñas para ver resultados (mínimo 10 reseñas)';
                    }
                }
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
                    return `${data.topSong.totalComments} comentario${data.topSong.totalComments !== 1 ? 's' : ''} en ${data.topSong.totalReviews} reseña${data.topSong.totalReviews !== 1 ? 's' : ''}`;
                }
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
        const colors = {
            'lo-mas-recomendado': '7C3AED-EC4899',
            'lo-mas-comentado': '3B82F6-8B5CF6',
            'top-10-semana': 'EC4899-7C3AED',
            'top-50-mes': '8B5CF6-3B82F6',
            'trending': '7C3AED-3B82F6'
        };

        const gradient = colors[categoryId] || '7C3AED-EC4899';
        const titleShort = categoryTitle.replace(/\s+/g, '%20');
        
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
            item.style.cursor = 'pointer';
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
            (async () => {
                try {
                    const firstContent = await loadCarouselContent(top.id, data);
                    if (firstContent && firstContent.length > 0) {
                        const firstImage = firstContent[0].image || firstContent[0].albumImage || firstContent[0].artistImage;
                        if (firstImage && firstImage !== '../Assets/default-avatar.png') {
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
            goToSlide(0);
            startAutoPlay();
            console.log('✅ Carrusel recargado exitosamente');
        } catch (error) {
            console.error('❌ Error recargando carrusel:', error);
        }
    };

    // Initialize carousel (async)
    createCarouselItems().then(() => {
        startAutoPlay();
    }).catch(error => {
        console.error('Error inicializando carrusel:', error);
        startAutoPlay();
    });
}

