/**
 * Módulo de feed de reseñas
 * Carga reseñas y busca sus datos de canción/álbum correspondientes.
 */

import { API_BASE_URL } from '../../APIs/configApi.js';
import { getReviews, getUser, getReviewReactionCount, getCommentsByReview } from '../../APIs/socialApi.js';
import { getSongById, getAlbumById } from '../../APIs/contentApi.js';
import { createReviewCard } from '../renderContent.js'; 
import { showAlert } from '../../Utils/reviewHelpers.js';
import { setReviewFilter } from './reviewUtils.js';

export function initializeReviews(commentsData, setLoadReviews, getCurrentFilter, setCurrentFilter) {
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return;

    // --- 1. DEFINICIÓN DE FILTROS (ESTO FALTABA) ---
    function initializeReviewFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remover clase active de todos
                filterButtons.forEach(b => b.classList.remove('active'));
                // Agregar a este
                btn.classList.add('active');
                
                const filter = btn.dataset.filter;
                if (typeof setCurrentFilter === 'function') {
                    setReviewFilter(filter, setCurrentFilter, loadReviewsFunction);
                }
            });
        });
    }

    // --- 2. FUNCIÓN PRINCIPAL DE CARGA ---
    async function loadReviewsFunction() {
        const currentUserId = localStorage.getItem('userId');
        
        // Mostrar Spinner
        reviewsList.innerHTML = '<div class="text-center text-light py-4"><div class="spinner-border" role="status"></div></div>';

        try {
            // A. Obtener reseñas de SocialAPI
            let reviews = [];
            try {
                const response = await axios.get(`${API_BASE_URL}/api/gateway/reviews`, { timeout: 5000 });
                reviews = response.data || [];
            } catch (error) {
                console.warn("API de reseñas no disponible.");
                reviewsList.innerHTML = '<p class="text-light text-center p-4">No se pudieron cargar las reseñas.</p>';
                return;
            }

            if (!reviews || reviews.length === 0) {
                reviewsList.innerHTML = '<p class="text-light text-center p-4">No hay reseñas aún.</p>';
                return;
            }

            // B. ENRIQUECIMIENTO DE DATOS
            const enrichedReviews = await Promise.all(reviews.map(async (review) => {
                try {
                    // Normalizar IDs
                    const reviewId = review.ReviewId || review.reviewId || review.id;
                    const userId = review.UserId || review.userId;
                    const songId = review.SongId || review.songId;
                    const albumId = review.AlbumId || review.albumId;

                    // Valores por defecto
                    let itemTitle = "Sin título";
                    let artistName = "Artista Desconocido";
                    let contentType = "General";
                    let image = "../Assets/default-avatar.png";

                    // Buscar datos en ContentAPI
                    if (songId) {
                        contentType = "Canción";
                        const songData = await getSongById(songId);
                        if (songData) {
                            itemTitle = songData.title || songData.Title || itemTitle;
                            artistName = songData.artistName || songData.ArtistName || 
                                       (songData.artist ? songData.artist.name : artistName);
                            image = songData.image || songData.Image || image;
                        } else {
                             console.warn(`Canción no encontrada en DB para ID: ${songId}`);
                        }
                    } else if (albumId) {
                        contentType = "Álbum";
                        const albumData = await getAlbumById(albumId);
                        if (albumData) {
                            itemTitle = albumData.title || albumData.Title || itemTitle;
                            artistName = albumData.artistName || albumData.ArtistName || 
                                       (albumData.artist ? albumData.artist.name : artistName);
                            image = albumData.image || albumData.Image || image;
                        } else {
                             console.warn(`Álbum no encontrado en DB para ID: ${albumId}`);
                        }
                    }

                    // Datos de Usuario y Social
                    const [userData, likes, comments] = await Promise.all([
                        getUser(userId).catch(() => null),
                        getReviewReactionCount(reviewId).catch(() => 0),
                        getCommentsByReview(reviewId).catch(() => [])
                    ]);

                    // Retornar objeto final
                    return {
                        id: reviewId,
                        username: userData?.username || userData?.Username || 'Usuario',
                        avatar: userData?.imgProfile || userData?.ImgProfile || '../Assets/default-avatar.png',
                        contentType: contentType,
                        itemTitle: itemTitle, 
                        artistName: artistName,
                        image: image,
                        
                        title: review.Title || review.title || '',
                        comment: review.Content || review.content || '',
                        rating: review.Rating || review.rating || 0,
                        likes: likes,
                        comments: comments.length,
                        userId: userId,
                        createdAt: review.CreatedAt || review.Created || new Date()
                    };

                } catch (err) {
                    console.error("Error procesando reseña:", err);
                    return null;
                }
            }));

            // C. Renderizar
            const validReviews = enrichedReviews.filter(r => r !== null);
            
            // Ordenar por fecha (más reciente primero) por defecto
            // validReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            reviewsList.innerHTML = validReviews.map(createReviewCard).join('');

        } catch (error) {
            console.error("Error fatal en feed:", error);
            reviewsList.innerHTML = '<p class="text-danger text-center">Error al cargar el feed.</p>';
        }
    }

    // --- 3. INICIALIZACIÓN ---
    if (typeof setLoadReviews === 'function') {
        setLoadReviews(loadReviewsFunction);
    }
    
    // Inicializar filtros
    initializeReviewFilters();
    
    // Cargar reseñas
    loadReviewsFunction();
}