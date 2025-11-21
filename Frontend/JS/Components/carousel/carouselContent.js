/**
 * Módulo de contenido del carrusel
 * Funciones para cargar y mostrar contenido de las categorías del carrusel
 */

import { getReviews, getCommentsByReview, getReviewReactionCount } from '../../APIs/socialApi.js';
import { getSongByApiId, getSongById, getAlbumById } from '../../APIs/contentApi.js';

/**
 * Carga el contenido de una categoría del carrusel
 * @param {string} categoryId - ID de la categoría
 * @param {Object} categoryData - Datos de la categoría (opcional)
 * @returns {Promise<Array>} Array de contenido
 */
export async function loadCarouselContent(categoryId, categoryData) {
    try {
        const reviews = await getReviews();
        if (!reviews || reviews.length === 0) return [];

        let songsMap = {};
        const reviewIds = reviews.map(r => r.ReviewId || r.reviewId || r.id).filter(Boolean);

        // Obtener comentarios y likes en paralelo
        const [commentsArrays, likesArrays] = await Promise.all([
            Promise.all(reviewIds.map(id => getCommentsByReview(id).catch(() => []))),
            Promise.all(reviewIds.map(id => getReviewReactionCount(id).catch(() => 0)))
        ]);

        // Procesar según la categoría
        if (categoryId === 'lo-mas-recomendado') {
            // Agrupar por canción/álbum y calcular promedio (mínimo 10 reseñas)
            const contentMap = {}; // Cambiar nombre para incluir álbumes también
            reviews.forEach((review, index) => {
                const songId = review.SongId || review.songId;
                const albumId = review.AlbumId || review.albumId;
                const contentId = songId || albumId;
                const contentType = songId ? 'song' : 'album';
                
                if (!contentId) return;
                if (!contentMap[contentId]) {
                    contentMap[contentId] = { 
                        contentId, 
                        contentType,
                        ratings: [], 
                        reviewIds: [] 
                    };
                }
                contentMap[contentId].ratings.push(review.Rating || review.rating || 0);
                contentMap[contentId].reviewIds.push(reviewIds[index]);
            });

            const contentWithAvg = Object.values(contentMap)
                .filter(c => c.ratings.length >= 10)
                .map(c => ({
                    ...c,
                    avgRating: c.ratings.reduce((a, b) => a + b, 0) / c.ratings.length,
                    totalReviews: c.ratings.length
                }))
                .sort((a, b) => b.avgRating - a.avgRating)
                .slice(0, 10);

            // Obtener datos de canciones/álbumes
            const contentData = await Promise.all(
                contentWithAvg.map(async (c) => {
                    try {
                        if (c.contentType === 'song') {
                            // Para canciones
                            const songData = await getSongById(c.contentId);
                            if (songData && (songData.Title || songData.title)) {
                                return { ...songData, contentType: 'song' };
                            }
                            if (songData) {
                                const apiSongId = songData.apiSongId || songData.APISongId;
                                if (apiSongId) {
                                    const fullSongData = await getSongByApiId(apiSongId);
                                    return fullSongData ? { ...fullSongData, contentType: 'song' } : null;
                                }
                            }
                            return await getSongByApiId(c.contentId).then(data => data ? { ...data, contentType: 'song' } : null);
                        } else {
                            // Para álbumes
                            const albumData = await getAlbumById(c.contentId);
                            if (albumData && (albumData.Title || albumData.title)) {
                                return { ...albumData, contentType: 'album' };
                            }
                            if (albumData) {
                                const apiAlbumId = albumData.apiAlbumId || albumData.APIAlbumId;
                                if (apiAlbumId) {
                                    const fullAlbumData = await getAlbumByApiId(apiAlbumId);
                                    return fullAlbumData ? { ...fullAlbumData, contentType: 'album' } : null;
                                }
                            }
                            return await getAlbumByApiId(c.contentId).then(data => data ? { ...data, contentType: 'album' } : null);
                        }
                    } catch (e) {
                        return null;
                    }
                })
            );

            return contentData.filter(Boolean).map((content, i) => ({
                name: content.Title || content.title || content.Name || (content.contentType === 'song' ? 'Canción' : 'Álbum'),
                artist: content.ArtistName || content.artistName || content.Artist || 'Artista',
                image: content.Image || content.image || null,
                avgRating: contentWithAvg[i]?.avgRating || 0,
                totalReviews: contentWithAvg[i]?.totalReviews || 0,
                contentType: content.contentType || 'song'
            }));

        } else if (categoryId === 'lo-mas-comentado') {
            // Agrupar por canción/álbum y contar comentarios
            const contentMap = {};
            reviews.forEach((review, index) => {
                const songId = review.SongId || review.songId;
                const albumId = review.AlbumId || review.albumId;
                const contentId = songId || albumId;
                const contentType = songId ? 'song' : 'album';
                
                if (!contentId) return;
                if (!contentMap[contentId]) {
                    contentMap[contentId] = { 
                        contentId, 
                        contentType,
                        totalComments: 0, 
                        reviewIds: [] 
                    };
                }
                contentMap[contentId].totalComments += (commentsArrays[index]?.length || 0);
                contentMap[contentId].reviewIds.push(reviewIds[index]);
            });

            const contentSorted = Object.values(contentMap)
                .sort((a, b) => b.totalComments - a.totalComments)
                .slice(0, 10);

            const contentData = await Promise.all(
                contentSorted.map(async (c) => {
                    try {
                        if (c.contentType === 'song') {
                            const songData = await getSongById(c.contentId);
                            if (songData && (songData.Title || songData.title)) {
                                return { ...songData, contentType: 'song' };
                            }
                            if (songData) {
                                const apiSongId = songData.apiSongId || songData.APISongId;
                                if (apiSongId) {
                                    const fullSongData = await getSongByApiId(apiSongId);
                                    return fullSongData ? { ...fullSongData, contentType: 'song' } : null;
                                }
                            }
                            return await getSongByApiId(c.contentId).then(data => data ? { ...data, contentType: 'song' } : null);
                        } else {
                            const albumData = await getAlbumById(c.contentId);
                            if (albumData && (albumData.Title || albumData.title)) {
                                return { ...albumData, contentType: 'album' };
                            }
                            if (albumData) {
                                const apiAlbumId = albumData.apiAlbumId || albumData.APIAlbumId;
                                if (apiAlbumId) {
                                    const fullAlbumData = await getAlbumByApiId(apiAlbumId);
                                    return fullAlbumData ? { ...fullAlbumData, contentType: 'album' } : null;
                                }
                            }
                            return await getAlbumByApiId(c.contentId).then(data => data ? { ...data, contentType: 'album' } : null);
                        }
                    } catch (e) {
                        return null;
                    }
                })
            );

            return contentData.filter(Boolean).map((content, i) => ({
                name: content.Title || content.title || content.Name || (content.contentType === 'song' ? 'Canción' : 'Álbum'),
                artist: content.ArtistName || content.artistName || content.Artist || 'Artista',
                image: content.Image || content.image || null,
                totalComments: contentSorted[i]?.totalComments || 0,
                contentType: content.contentType || 'song'
            }));

        } else if (categoryId === 'top-10-semana' || categoryId === 'top-50-mes') {
            // Filtrar por período
            const periodStart = categoryId === 'top-10-semana' 
                ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const limit = categoryId === 'top-10-semana' ? 10 : 50;

            const periodReviews = reviews.filter(r => {
                const date = new Date(r.CreatedAt || r.Created || r.createdAt);
                return date >= periodStart;
            });

            const contentMap = {};
            periodReviews.forEach((review, index) => {
                const songId = review.SongId || review.songId;
                const albumId = review.AlbumId || review.albumId;
                const contentId = songId || albumId;
                const contentType = songId ? 'song' : 'album';
                
                if (!contentId) return;
                if (!contentMap[contentId]) {
                    contentMap[contentId] = {
                        contentId,
                        contentType,
                        totalRating: 0,
                        reviewCount: 0,
                        totalComments: 0,
                        totalLikes: 0
                    };
                }
                const reviewIndex = reviews.indexOf(review);
                contentMap[contentId].totalRating += (review.Rating || review.rating || 0);
                contentMap[contentId].reviewCount += 1;
                contentMap[contentId].totalComments += (commentsArrays[reviewIndex]?.length || 0);
                contentMap[contentId].totalLikes += (likesArrays[reviewIndex] || 0);
            });

            const contentWithScore = Object.values(contentMap)
                .map(c => ({
                    ...c,
                    score: (c.totalRating / c.reviewCount) * 2 + c.totalComments * 0.5 + c.totalLikes * 0.3
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);

            const contentData = await Promise.all(
                contentWithScore.map(async (c) => {
                    try {
                        if (c.contentType === 'song') {
                            const songData = await getSongById(c.contentId);
                            if (songData && (songData.Title || songData.title)) {
                                return { ...songData, contentType: 'song' };
                            }
                            if (songData) {
                                const apiSongId = songData.apiSongId || songData.APISongId;
                                if (apiSongId) {
                                    const fullSongData = await getSongByApiId(apiSongId);
                                    return fullSongData ? { ...fullSongData, contentType: 'song' } : null;
                                }
                            }
                            return await getSongByApiId(c.contentId).then(data => data ? { ...data, contentType: 'song' } : null);
                        } else {
                            const albumData = await getAlbumById(c.contentId);
                            if (albumData && (albumData.Title || albumData.title)) {
                                return { ...albumData, contentType: 'album' };
                            }
                            if (albumData) {
                                const apiAlbumId = albumData.apiAlbumId || albumData.APIAlbumId;
                                if (apiAlbumId) {
                                    const fullAlbumData = await getAlbumByApiId(apiAlbumId);
                                    return fullAlbumData ? { ...fullAlbumData, contentType: 'album' } : null;
                                }
                            }
                            return await getAlbumByApiId(c.contentId).then(data => data ? { ...data, contentType: 'album' } : null);
                        }
                    } catch (e) {
                        return null;
                    }
                })
            );

            return contentData.filter(Boolean).map((content, i) => ({
                name: content.Title || content.title || content.Name || (content.contentType === 'song' ? 'Canción' : 'Álbum'),
                artist: content.ArtistName || content.artistName || content.Artist || 'Artista',
                image: content.Image || content.image || null,
                score: contentWithScore[i]?.score || 0,
                contentType: content.contentType || 'song'
            }));

        } else if (categoryId === 'trending') {
            // Calcular crecimiento (últimas 48h vs 48-96h)
            const now = new Date();
            const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
            const last96h = new Date(now.getTime() - 96 * 60 * 60 * 1000);

            const recentReviews = reviews.filter(r => {
                const date = new Date(r.CreatedAt || r.Created || r.createdAt);
                return date >= last48h;
            });
            const previousReviews = reviews.filter(r => {
                const date = new Date(r.CreatedAt || r.Created || r.createdAt);
                return date >= last96h && date < last48h;
            });

            const recentActivity = {};
            const previousActivity = {};

            recentReviews.forEach(r => {
                const songId = r.SongId || r.songId;
                const albumId = r.AlbumId || r.albumId;
                const contentId = songId || albumId;
                if (contentId) recentActivity[contentId] = (recentActivity[contentId] || 0) + 1;
            });
            previousReviews.forEach(r => {
                const songId = r.SongId || r.songId;
                const albumId = r.AlbumId || r.albumId;
                const contentId = songId || albumId;
                if (contentId) previousActivity[contentId] = (previousActivity[contentId] || 0) + 1;
            });

            const growthRates = Object.keys(recentActivity).map(contentId => {
                const recent = recentActivity[contentId] || 0;
                const previous = previousActivity[contentId] || 0;
                const growth = previous === 0 ? (recent > 0 ? 100 : 0) : ((recent - previous) / previous) * 100;
                // Determinar si es canción o álbum basándose en las reseñas
                const review = recentReviews.find(r => (r.SongId || r.songId) === contentId || (r.AlbumId || r.albumId) === contentId);
                const contentType = (review?.SongId || review?.songId) ? 'song' : 'album';
                return { contentId, contentType, growthRate: growth };
            }).sort((a, b) => b.growthRate - a.growthRate).slice(0, 10);

            const contentData = await Promise.all(
                growthRates.map(async (g) => {
                    try {
                        if (g.contentType === 'song') {
                            const songData = await getSongById(g.contentId);
                            if (songData && (songData.Title || songData.title)) {
                                return { ...songData, contentType: 'song' };
                            }
                            if (songData) {
                                const apiSongId = songData.apiSongId || songData.APISongId;
                                if (apiSongId) {
                                    const fullSongData = await getSongByApiId(apiSongId);
                                    return fullSongData ? { ...fullSongData, contentType: 'song' } : null;
                                }
                            }
                            return await getSongByApiId(g.contentId).then(data => data ? { ...data, contentType: 'song' } : null);
                        } else {
                            const albumData = await getAlbumById(g.contentId);
                            if (albumData && (albumData.Title || albumData.title)) {
                                return { ...albumData, contentType: 'album' };
                            }
                            if (albumData) {
                                const apiAlbumId = albumData.apiAlbumId || albumData.APIAlbumId;
                                if (apiAlbumId) {
                                    const fullAlbumData = await getAlbumByApiId(apiAlbumId);
                                    return fullAlbumData ? { ...fullAlbumData, contentType: 'album' } : null;
                                }
                            }
                            return await getAlbumByApiId(g.contentId).then(data => data ? { ...data, contentType: 'album' } : null);
                        }
                    } catch (e) {
                        return null;
                    }
                })
            );

            return contentData.filter(Boolean).map((content, i) => ({
                name: content.Title || content.title || content.Name || (content.contentType === 'song' ? 'Canción' : 'Álbum'),
                artist: content.ArtistName || content.artistName || content.Artist || 'Artista',
                image: content.Image || content.image || null,
                growthRate: Math.round(growthRates[i]?.growthRate || 0),
                contentType: content.contentType || 'song'
            }));
        }

        return [];
    } catch (error) {
        console.error(`Error cargando contenido del carrusel para ${categoryId}:`, error);
        return [];
    }
}

/**
 * Muestra el modal con el contenido de una categoría del carrusel
 * @param {string} categoryId - ID de la categoría
 * @param {string} categoryTitle - Título de la categoría
 * @param {string} categoryText - Texto descriptivo
 * @param {string} categoryDescription - Descripción detallada
 * @param {Object} categoryData - Datos de la categoría
 */
export function showCarouselContentModal(categoryId, categoryTitle, categoryText, categoryDescription, categoryData) {
    const modal = document.getElementById('carouselContentModalOverlay');
    if (!modal) {
        console.error('Modal de contenido del carrusel no encontrado');
        return;
    }

    // Mostrar el modal
    modal.style.display = 'flex';

    // Actualizar título
    const titleEl = document.getElementById('carouselContentTitle');
    if (titleEl) {
        titleEl.textContent = categoryTitle;
    }

    // Actualizar descripción
    const descriptionEl = document.getElementById('carouselContentDescription');
    if (descriptionEl) {
        descriptionEl.innerHTML = `
            <p style="color: rgba(255, 255, 255, 0.9); margin-bottom: 0.5rem; font-size: 1rem;">${categoryText}</p>
            <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.9rem;">${categoryDescription}</p>
        `;
    }

    // Limpiar lista de contenido
    const contentListEl = document.getElementById('carouselContentList');
    if (contentListEl) {
        contentListEl.innerHTML = '<div style="padding: 2rem; text-align: center; color: rgba(255, 255, 255, 0.6);">Cargando contenido...</div>';
    }

    // Cargar contenido de forma asíncrona
    loadCarouselContent(categoryId, categoryData).then(content => {
        if (contentListEl) {
            if (content && content.length > 0) {
                // Renderizar lista de contenido
                contentListEl.innerHTML = content.map(item => {
                    const image = item.image || item.albumImage || item.artistImage || '../Assets/default-avatar.png';
                    const name = item.name || item.title || item.Name || item.Title || 'Sin nombre';
                    const artist = item.artist || item.artistName || item.ArtistName || 'Artista desconocido';
                    
                    return `
                        <div class="carousel-content-item" style="padding: 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; gap: 1rem; cursor: pointer;">
                            <img src="${image}" alt="${name}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;" onerror="this.src='../Assets/default-avatar.png'">
                            <div style="flex: 1;">
                                <h4 style="color: #fff; margin: 0 0 0.25rem 0; font-size: 1rem;">${name}</h4>
                                <p style="color: rgba(255, 255, 255, 0.6); margin: 0; font-size: 0.9rem;">${artist}</p>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                contentListEl.innerHTML = '<div style="padding: 2rem; text-align: center; color: rgba(255, 255, 255, 0.6);">No hay contenido disponible en esta categoría aún.</div>';
            }
        }
    }).catch(error => {
        console.error('Error cargando contenido del modal:', error);
        if (contentListEl) {
            contentListEl.innerHTML = '<div style="padding: 2rem; text-align: center; color: #ff6b6b;">Error al cargar el contenido. Por favor, intenta nuevamente.</div>';
        }
    });

    // Configurar botón de cerrar
    const closeBtn = document.getElementById('closeCarouselContentModal');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }

    // Cerrar al hacer clic fuera del modal
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
}

