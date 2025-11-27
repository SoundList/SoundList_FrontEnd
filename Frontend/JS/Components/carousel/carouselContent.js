/**
 * Módulo de contenido del carrusel
 * Funciones para cargar y mostrar contenido de las categorías del carrusel
 */

import { getReviews, getCommentsByReview, getReviewReactionCount } from '../../APIs/socialApi.js';
import { getSongByApiId, getSongById, getAlbumById, getAlbumByApiId } from '../../APIs/contentApi.js';

/**
 * Función auxiliar para obtener datos de canción usando GUID interno o apiSongId
 * @param {string} songId - Puede ser GUID interno o apiSongId
 * @returns {Promise<Object|null>} Datos de la canción
 */
async function getSongData(songId) {
    if (!songId) return null;
    
    try {
        console.log(`🎵 getSongData: Intentando obtener datos para songId: ${songId}`);
        
        // Primero intentar con getSongById (GUID interno)
        const songData = await getSongById(songId);
        console.log(`🎵 getSongData: getSongById result:`, songData ? 'OK' : 'NULL');
        
        if (songData) {
            console.log(`🎵 getSongData: songData recibido:`, {
                hasTitle: !!(songData.Title || songData.title),
                hasName: !!(songData.Name || songData.name),
                hasApiId: !!(songData.apiSongId || songData.APISongId),
                apiSongId: songData.apiSongId || songData.APISongId || 'N/A',
                title: songData.Title || songData.title || songData.Name || 'N/A'
            });
            
            // Si tiene título, usarlo directamente
            if (songData.Title || songData.title || songData.Name) {
                console.log(`🎵 getSongData: Usando datos de getSongById directamente`);
                return songData;
            }
            
            // Si tiene apiSongId pero no título, obtener datos completos de Spotify
            const apiSongId = songData.apiSongId || songData.APISongId;
            if (apiSongId) {
                console.log(`🎵 getSongData: Obteniendo datos completos de Spotify con apiSongId: ${apiSongId}`);
                const fullSongData = await getSongByApiId(apiSongId);
                console.log(`🎵 getSongData: getSongByApiId result:`, fullSongData ? 'OK' : 'NULL', fullSongData ? { 
                    title: fullSongData.Title || fullSongData.title || 'N/A', 
                    artist: fullSongData.ArtistName || fullSongData.artistName || 'N/A' 
                } : null);
                return fullSongData || songData;
            }
        }
        
        // Si getSongById retornó null, las canciones no existen en la base de datos local
        // No intentar con getSongByApiId porque el GUID interno no es un API ID de Spotify
        console.log(`⚠️ getSongData: No se encontraron datos en la base de datos local para ${songId}`);
        return null;
    } catch (e) {
        console.warn('❌ Error obteniendo datos de canción:', songId, e);
        return null;
    }
}

/**
 * Función auxiliar para obtener datos de álbum usando GUID interno o apiAlbumId
 * @param {string} albumId - Puede ser GUID interno o apiAlbumId
 * @returns {Promise<Object|null>} Datos del álbum
 */
async function getAlbumData(albumId) {
    if (!albumId) return null;
    
    try {
        // Primero intentar con getAlbumById (GUID interno)
        const albumData = await getAlbumById(albumId);
        if (albumData && (albumData.Title || albumData.title)) {
            // Si getAlbumById devuelve datos completos, usarlos
            return albumData;
        }
        
        // Si getAlbumById devolvió datos pero sin título, obtener el apiAlbumId
        if (albumData) {
            const apiAlbumId = albumData.apiAlbumId || albumData.APIAlbumId;
            if (apiAlbumId) {
                const fullAlbumData = await getAlbumByApiId(apiAlbumId);
                return fullAlbumData || albumData;
            }
        }
        
        // Si getAlbumById falló o no devolvió datos, intentar directamente con getAlbumByApiId
        // (por si acaso el albumId es un apiAlbumId)
        return await getAlbumByApiId(albumId);
    } catch (e) {
        console.debug('Error obteniendo datos de álbum:', albumId, e);
        return null;
    }
}

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

            // Si hay pocas reseñas en total, mostrar todas las canciones/álbumes con al menos 1 reseña
            // Si hay muchas reseñas, usar mínimo 10 por contenido para mejor calidad
            const totalReviewsCount = reviews.length;
            const minReviews = totalReviewsCount < 50 ? 1 : 10; // Flexible según cantidad total
            
            const contentWithAvg = Object.values(contentMap)
                .filter(c => c.ratings.length >= minReviews)
                .map(c => ({
                    ...c,
                    avgRating: c.ratings.reduce((a, b) => a + b, 0) / c.ratings.length,
                    totalReviews: c.ratings.length
                }))
                .sort((a, b) => {
                    // Ordenar primero por promedio de rating, luego por cantidad de reseñas
                    if (Math.abs(b.avgRating - a.avgRating) < 0.1) {
                        return b.totalReviews - a.totalReviews;
                    }
                    return b.avgRating - a.avgRating;
                })
                .slice(0, 10);

            // Obtener datos de canciones/álbumes usando las funciones auxiliares
            // Primero intentar desde localStorage usando los reviewIds asociados
            const contentData = await Promise.all(
                contentWithAvg.map(async (c) => {
                    try {
                        // Intentar obtener datos desde localStorage usando el primer reviewId
                        let contentDataFromStorage = null;
                        if (c.reviewIds && c.reviewIds.length > 0) {
                            for (const reviewId of c.reviewIds) {
                                const storageKey = `review_content_${reviewId}`;
                                const storedData = localStorage.getItem(storageKey);
                                if (storedData) {
                                    try {
                                        contentDataFromStorage = JSON.parse(storedData);
                                        console.log(`📦 Datos encontrados en localStorage para review ${reviewId}:`, contentDataFromStorage);
                                        break; // Usar el primer dato encontrado
                                    } catch (e) {
                                        // Ignorar errores de parseo
                                    }
                                }
                            }
                        }
                        
                        // Si hay datos en localStorage y coinciden con el tipo de contenido, usarlos
                        if (contentDataFromStorage && 
                            ((c.contentType === 'song' && contentDataFromStorage.type === 'song') ||
                             (c.contentType === 'album' && contentDataFromStorage.type === 'album'))) {
                            console.log(`✅ Usando datos de localStorage para ${c.contentId}`);
                            return {
                                Title: contentDataFromStorage.name,
                                title: contentDataFromStorage.name,
                                Name: contentDataFromStorage.name,
                                ArtistName: contentDataFromStorage.artist,
                                artistName: contentDataFromStorage.artist,
                                Artist: contentDataFromStorage.artist,
                                Image: contentDataFromStorage.image,
                                image: contentDataFromStorage.image,
                                contentType: c.contentType,
                                apiSongId: contentDataFromStorage.id || contentDataFromStorage.apiSongId,
                                apiAlbumId: contentDataFromStorage.id || contentDataFromStorage.apiAlbumId
                            };
                        }
                        
                        // Si no hay datos en localStorage, intentar desde la API
                        if (c.contentType === 'song') {
                            const songData = await getSongData(c.contentId);
                            if (songData) {
                                return {
                                    ...songData,
                                    contentType: 'song',
                                    apiSongId: songData.apiSongId || songData.APISongId || songData.id
                                };
                            }
                            return null;
                        } else {
                            const albumData = await getAlbumData(c.contentId);
                            if (albumData) {
                                return {
                                    ...albumData,
                                    contentType: 'album',
                                    apiAlbumId: albumData.apiAlbumId || albumData.APIAlbumId || albumData.id
                                };
                            }
                            return null;
                        }
                    } catch (e) {
                        console.debug('Error obteniendo datos de contenido:', c.contentId, e);
                        return null;
                    }
                })
            );

            // Mapear resultados: si no hay datos del contenido, usar información de las reseñas
            return contentWithAvg.map((c, i) => {
                const content = contentData[i];
                console.log(`🎵 Mapeando contenido ${i + 1}/${contentWithAvg.length}:`, {
                    contentId: c.contentId,
                    contentType: c.contentType,
                    hasContentData: !!content,
                    contentTitle: content?.Title || content?.title || content?.Name || 'N/A',
                    contentArtist: content?.ArtistName || content?.artistName || content?.Artist || 'N/A'
                });
                
                if (content && (content.Title || content.title || content.Name)) {
                    // Si hay datos del contenido con título, usarlos
                    return {
                        name: content.Title || content.title || content.Name,
                        artist: content.ArtistName || content.artistName || content.Artist || 'Artista',
                        image: content.Image || content.image || null,
                        avgRating: c.avgRating || 0,
                        totalReviews: c.totalReviews || 0,
                        contentType: c.contentType || 'song',
                        apiSongId: content.apiSongId || content.APISongId || content.id,
                        apiAlbumId: content.apiAlbumId || content.APIAlbumId || content.id
                    };
                } else {
                    // Si no hay datos del contenido, mostrar información útil basada en las reseñas
                    console.log(`⚠️ No hay datos del contenido para ${c.contentId}, usando información de reseñas`);
                    return {
                        name: `${c.contentType === 'song' ? 'Canción' : 'Álbum'} con ${c.totalReviews} ${c.totalReviews === 1 ? 'reseña' : 'reseñas'}`,
                        artist: `Promedio: ${c.avgRating.toFixed(1)} ⭐`,
                        image: null,
                        avgRating: c.avgRating || 0,
                        totalReviews: c.totalReviews || 0,
                        contentType: c.contentType || 'song',
                        apiSongId: null,
                        apiAlbumId: null
                    };
                }
            });

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
                        // Intentar obtener datos desde localStorage usando los reviewIds asociados
                        let contentDataFromStorage = null;
                        if (c.reviewIds && c.reviewIds.length > 0) {
                            for (const reviewId of c.reviewIds) {
                                const storageKey = `review_content_${reviewId}`;
                                const storedData = localStorage.getItem(storageKey);
                                if (storedData) {
                                    try {
                                        contentDataFromStorage = JSON.parse(storedData);
                                        if (contentDataFromStorage && 
                                            ((c.contentType === 'song' && contentDataFromStorage.type === 'song') ||
                                             (c.contentType === 'album' && contentDataFromStorage.type === 'album'))) {
                                            break;
                                        }
                                    } catch (e) {
                                        // Ignorar errores de parseo
                                    }
                                }
                            }
                        }
                        
                        // Si hay datos en localStorage, usarlos
                        if (contentDataFromStorage && 
                            ((c.contentType === 'song' && contentDataFromStorage.type === 'song') ||
                             (c.contentType === 'album' && contentDataFromStorage.type === 'album'))) {
                            return {
                                Title: contentDataFromStorage.name,
                                title: contentDataFromStorage.name,
                                Name: contentDataFromStorage.name,
                                ArtistName: contentDataFromStorage.artist,
                                artistName: contentDataFromStorage.artist,
                                Artist: contentDataFromStorage.artist,
                                Image: contentDataFromStorage.image,
                                image: contentDataFromStorage.image,
                                contentType: c.contentType,
                                apiSongId: contentDataFromStorage.id || contentDataFromStorage.apiSongId,
                                apiAlbumId: contentDataFromStorage.id || contentDataFromStorage.apiAlbumId
                            };
                        }
                        
                        // Si no hay datos en localStorage, intentar desde la API
                        if (c.contentType === 'song') {
                            const songData = await getSongData(c.contentId);
                            if (songData) {
                                return {
                                    ...songData,
                                    contentType: 'song',
                                    apiSongId: songData.apiSongId || songData.APISongId || songData.id
                                };
                            }
                            return null;
                        } else {
                            const albumData = await getAlbumData(c.contentId);
                            if (albumData) {
                                return {
                                    ...albumData,
                                    contentType: 'album',
                                    apiAlbumId: albumData.apiAlbumId || albumData.APIAlbumId || albumData.id
                                };
                            }
                            return null;
                        }
                    } catch (e) {
                        console.debug('Error obteniendo datos de contenido:', c.contentId, e);
                        return null;
                    }
                })
            );

            // Mapear resultados: si no hay datos del contenido, usar información de las reseñas
            return contentSorted.map((c, i) => {
                const content = contentData[i];
                if (content && (content.Title || content.title || content.Name)) {
                    return {
                        name: content.Title || content.title || content.Name,
                        artist: content.ArtistName || content.artistName || content.Artist || 'Artista',
                        image: content.Image || content.image || null,
                        totalComments: c.totalComments || 0,
                        contentType: c.contentType || 'song',
                        apiSongId: content.apiSongId || content.APISongId || content.id,
                        apiAlbumId: content.apiAlbumId || content.APIAlbumId || content.id
                    };
                } else {
                    return {
                        name: `${c.contentType === 'song' ? 'Canción' : 'Álbum'} con ${c.totalComments} ${c.totalComments === 1 ? 'comentario' : 'comentarios'}`,
                        artist: 'Más comentado',
                        image: null,
                        totalComments: c.totalComments || 0,
                        contentType: c.contentType || 'song',
                        apiSongId: null,
                        apiAlbumId: null
                    };
                }
            });

        } else if (categoryId === 'top-10-semana' || categoryId === 'top-50-mes') {
            // Filtrar por período
            const periodStart = categoryId === 'top-10-semana' 
                ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const limit = categoryId === 'top-10-semana' ? 10 : 50;

            console.log(`📊 ${categoryId}: Filtrando reseñas desde ${periodStart.toISOString()}`);
            console.log(`📊 ${categoryId}: Total de reseñas disponibles: ${reviews.length}`);

            const periodReviews = reviews.filter(r => {
                const dateStr = r.CreatedAt || r.Created || r.createdAt;
                if (!dateStr) return false;
                const date = new Date(dateStr);
                const isValid = !isNaN(date.getTime()) && date >= periodStart;
                return isValid;
            });

            console.log(`📊 ${categoryId}: Reseñas en el período: ${periodReviews.length}`);

            // Si no hay reseñas en el período, usar todas las reseñas (fallback)
            const reviewsToUse = periodReviews.length > 0 ? periodReviews : reviews;
            if (periodReviews.length === 0) {
                console.log(`⚠️ ${categoryId}: No hay reseñas en el período, usando todas las reseñas como fallback`);
            }

            // Filtrar reseñas que tienen ID válido y contenido (canción o álbum)
            const validReviews = reviewsToUse.filter(r => {
                const reviewId = r.ReviewId || r.reviewId || r.id;
                return reviewId && (r.SongId || r.songId || r.AlbumId || r.albumId);
            });
            
            // Obtener los reviewIds de las reseñas válidas
            const reviewIds = validReviews.map(r => r.ReviewId || r.reviewId || r.id);
            
            console.log(`📊 ${categoryId}: Reseñas válidas: ${validReviews.length}, ReviewIds: ${reviewIds.length}`);
            console.log(`📊 ${categoryId}: ReviewIds:`, reviewIds);
            
            // Obtener comentarios y likes solo para las reseñas válidas
            const [commentsArraysForPeriod, likesArraysForPeriod] = await Promise.all([
                Promise.all(reviewIds.map(id => getCommentsByReview(id).catch((err) => {
                    console.warn(`⚠️ ${categoryId}: Error obteniendo comentarios para review ${id}:`, err);
                    return [];
                }))),
                Promise.all(reviewIds.map((id, idx) => {
                    return getReviewReactionCount(id)
                        .then((count) => {
                            console.log(`✅ ${categoryId}: Review ${id} -> ${count} likes`);
                            return count;
                        })
                        .catch((err) => {
                            console.error(`❌ ${categoryId}: Error obteniendo likes para review ${id}:`, err);
                            console.error(`❌ ${categoryId}: Error details:`, err.response?.data || err.message);
                            return 0;
                        });
                }))
            ]);
            
            console.log(`📊 ${categoryId}: Likes obtenidos:`, likesArraysForPeriod);

            const contentMap = {};
            validReviews.forEach((review, index) => {
                const songId = review.SongId || review.songId;
                const albumId = review.AlbumId || review.albumId;
                const contentId = songId || albumId;
                const contentType = songId ? 'song' : 'album';
                
                if (!contentId) return;
                
                const reviewId = review.ReviewId || review.reviewId || review.id;
                
                if (!contentMap[contentId]) {
                    contentMap[contentId] = {
                        contentId,
                        contentType,
                        totalRating: 0,
                        reviewCount: 0,
                        totalComments: 0,
                        totalLikes: 0,
                        reviewIds: []
                    };
                }
                
                contentMap[contentId].totalRating += (review.Rating || review.rating || 0);
                contentMap[contentId].reviewCount += 1;
                
                // Usar el índice correcto para obtener comentarios y likes (basado en validReviews)
                const commentsCount = commentsArraysForPeriod[index]?.length || 0;
                const likesCount = likesArraysForPeriod[index] || 0;
                
                contentMap[contentId].totalComments += commentsCount;
                contentMap[contentId].totalLikes += likesCount;
                
                console.log(`📊 ${categoryId}: Review ${reviewId} -> Content ${contentId}: ${likesCount} likes, ${commentsCount} comentarios`);
                
                if (reviewId) {
                    contentMap[contentId].reviewIds.push(reviewId);
                }
            });
            
            // Log del contenido agrupado
            Object.values(contentMap).forEach(content => {
                console.log(`📊 ${categoryId}: Content ${content.contentId} (${content.contentType}): ${content.totalLikes} likes totales, ${content.totalComments} comentarios totales`);
            });

            console.log(`📊 ${categoryId}: Contenido agrupado: ${Object.keys(contentMap).length} items`);

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
                        // Intentar obtener datos desde localStorage usando los reviewIds asociados
                        let contentDataFromStorage = null;
                        if (c.reviewIds && c.reviewIds.length > 0) {
                            for (const reviewId of c.reviewIds) {
                                const storageKey = `review_content_${reviewId}`;
                                const storedData = localStorage.getItem(storageKey);
                                if (storedData) {
                                    try {
                                        contentDataFromStorage = JSON.parse(storedData);
                                        if (contentDataFromStorage && 
                                            ((c.contentType === 'song' && contentDataFromStorage.type === 'song') ||
                                             (c.contentType === 'album' && contentDataFromStorage.type === 'album'))) {
                                            break;
                                        }
                                    } catch (e) {
                                        // Ignorar errores de parseo
                                    }
                                }
                            }
                        }
                        
                        // Si hay datos en localStorage, usarlos
                        if (contentDataFromStorage && 
                            ((c.contentType === 'song' && contentDataFromStorage.type === 'song') ||
                             (c.contentType === 'album' && contentDataFromStorage.type === 'album'))) {
                            return {
                                Title: contentDataFromStorage.name,
                                title: contentDataFromStorage.name,
                                Name: contentDataFromStorage.name,
                                ArtistName: contentDataFromStorage.artist,
                                artistName: contentDataFromStorage.artist,
                                Artist: contentDataFromStorage.artist,
                                Image: contentDataFromStorage.image,
                                image: contentDataFromStorage.image,
                                contentType: c.contentType,
                                apiSongId: contentDataFromStorage.id || contentDataFromStorage.apiSongId,
                                apiAlbumId: contentDataFromStorage.id || contentDataFromStorage.apiAlbumId
                            };
                        }
                        
                        // Si no hay datos en localStorage, intentar desde la API
                        if (c.contentType === 'song') {
                            const songData = await getSongData(c.contentId);
                            if (songData) {
                                return {
                                    ...songData,
                                    contentType: 'song',
                                    apiSongId: songData.apiSongId || songData.APISongId || songData.id
                                };
                            }
                            return null;
                        } else {
                            const albumData = await getAlbumData(c.contentId);
                            if (albumData) {
                                return {
                                    ...albumData,
                                    contentType: 'album',
                                    apiAlbumId: albumData.apiAlbumId || albumData.APIAlbumId || albumData.id
                                };
                            }
                            return null;
                        }
                    } catch (e) {
                        console.debug('Error obteniendo datos de contenido:', c.contentId, e);
                        return null;
                    }
                })
            );

            // Mapear resultados: si no hay datos del contenido, usar información de las reseñas
            return contentWithScore.map((c, i) => {
                const content = contentData[i];
                const avgRating = c.totalRating && c.reviewCount ? (c.totalRating / c.reviewCount) : 0;
                const result = content && (content.Title || content.title || content.Name) ? {
                    name: content.Title || content.title || content.Name,
                    artist: content.ArtistName || content.artistName || content.Artist || 'Artista',
                    image: content.Image || content.image || null,
                    score: c.score || 0,
                    avgRating: avgRating,
                    reviewCount: c.reviewCount || 0,
                    totalComments: c.totalComments || 0,
                    totalLikes: c.totalLikes || 0,
                    contentType: c.contentType || 'song',
                    apiSongId: content.apiSongId || content.APISongId || content.id,
                    apiAlbumId: content.apiAlbumId || content.APIAlbumId || content.id
                } : {
                    name: `${c.contentType === 'song' ? 'Canción' : 'Álbum'} (Score: ${c.score.toFixed(1)})`,
                    artist: `${c.reviewCount} ${c.reviewCount === 1 ? 'reseña' : 'reseñas'}`,
                    image: null,
                    score: c.score || 0,
                    avgRating: avgRating,
                    reviewCount: c.reviewCount || 0,
                    totalComments: c.totalComments || 0,
                    totalLikes: c.totalLikes || 0,
                    contentType: c.contentType || 'song',
                    apiSongId: null,
                    apiAlbumId: null
                };
                
                return result;
            });

        } else if (categoryId === 'trending') {
            // Calcular crecimiento (últimas 24h vs 24-48h)
            const now = new Date();
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

            console.log(`📊 trending: Filtrando reseñas desde ${last24h.toISOString()}`);
            console.log(`📊 trending: Total de reseñas disponibles: ${reviews.length}`);

            // Log de fechas de las primeras reseñas para debug
            if (reviews.length > 0) {
                const sampleDates = reviews.slice(0, 5).map(r => {
                    const dateStr = r.CreatedAt || r.Created || r.createdAt || r.date || r.Date;
                    const date = dateStr ? new Date(dateStr) : null;
                    const timestamp = date ? date.getTime() : null;
                    const isValid = date && !isNaN(timestamp) && timestamp > 0 && 
                                   date.getFullYear() > 1 &&
                                   !dateStr?.toString().includes('0001-01-01');
                    return {
                        reviewId: r.ReviewId || r.reviewId || r.id,
                        dateStr: dateStr,
                        date: date ? date.toISOString() : 'invalid',
                        timestamp: timestamp,
                        year: date ? date.getFullYear() : 'N/A',
                        isValid: isValid,
                        allFields: {
                            CreatedAt: r.CreatedAt,
                            Created: r.Created,
                            createdAt: r.createdAt,
                            date: r.date,
                            Date: r.Date
                        }
                    };
                });
                console.log(`📊 trending: Fechas de muestra (expandidas):`, JSON.stringify(sampleDates, null, 2));
            }

            const recentReviews = reviews.filter(r => {
                const dateStr = r.CreatedAt || r.Created || r.createdAt || r.date || r.Date;
                if (!dateStr) return false;
                const date = new Date(dateStr);
                const timestamp = date.getTime();
                
                // Validar que la fecha sea válida y no sea una fecha inválida como 0001-01-01
                const isValid = !isNaN(timestamp) && timestamp > 0 && 
                               date.getFullYear() > 1 &&
                               !dateStr.toString().includes('0001-01-01');
                
                return isValid && date >= last24h;
            });
            const previousReviews = reviews.filter(r => {
                const dateStr = r.CreatedAt || r.Created || r.createdAt || r.date || r.Date;
                if (!dateStr) return false;
                const date = new Date(dateStr);
                const timestamp = date.getTime();
                
                // Validar que la fecha sea válida y no sea una fecha inválida como 0001-01-01
                const isValid = !isNaN(timestamp) && timestamp > 0 && 
                               date.getFullYear() > 1 &&
                               !dateStr.toString().includes('0001-01-01');
                
                return isValid && date >= last48h && date < last24h;
            });

            console.log(`📊 trending: Reseñas recientes (últimas 24h): ${recentReviews.length}`);
            console.log(`📊 trending: Reseñas previas (24-48h): ${previousReviews.length}`);

            // Si no hay reseñas recientes, usar las reseñas más recientes disponibles (fallback)
            let finalRecentReviews = recentReviews;
            let finalPreviousReviews = previousReviews;
            
            if (recentReviews.length === 0) {
                console.log(`⚠️ trending: No hay reseñas en las últimas 24h, usando las más recientes disponibles`);
                
                // Intentar obtener reseñas con fechas válidas primero
                const validReviews = reviews.map((r, index) => {
                    const dateStr = r.CreatedAt || r.Created || r.createdAt || r.date || r.Date;
                    if (!dateStr) return { review: r, index, hasValidDate: false, timestamp: null };
                    
                    const date = new Date(dateStr);
                    const timestamp = date.getTime();
                    const isValid = !isNaN(timestamp) && timestamp > 0 && 
                                   date.getFullYear() > 1 &&
                                   !dateStr.toString().includes('0001-01-01');
                    
                    // Si no tiene fecha válida, intentar usar timestamp de localStorage
                    let fallbackTimestamp = null;
                    if (!isValid) {
                        const reviewId = r.ReviewId || r.reviewId || r.id;
                        const storageTimestamp = localStorage.getItem(`review_created_at_${reviewId}`);
                        if (storageTimestamp) {
                            const ts = parseInt(storageTimestamp, 10);
                            if (!isNaN(ts) && ts > 0) {
                                fallbackTimestamp = ts;
                            }
                        }
                    }
                    
                    return {
                        review: r,
                        index,
                        hasValidDate: isValid,
                        timestamp: isValid ? timestamp : (fallbackTimestamp || (reviews.length - index) * 1000000) // Usar índice como fallback
                    };
                }).sort((a, b) => {
                    // Ordenar por timestamp (más recientes primero)
                    return b.timestamp - a.timestamp;
                }).map(item => item.review);
                
                console.log(`📊 trending: Reseñas procesadas: ${validReviews.length} de ${reviews.length}`);
                
                // Usar las 10 más recientes como "recentReviews" y las siguientes 10 como "previousReviews"
                finalRecentReviews = validReviews.slice(0, 10);
                finalPreviousReviews = validReviews.slice(10, 20);
                
                if (finalRecentReviews.length === 0) {
                    console.log(`⚠️ trending: No hay reseñas disponibles, no se mostrará contenido`);
                    return [];
                }
                
                console.log(`📊 trending: Usando ${finalRecentReviews.length} reseñas más recientes como fallback`);
            }

            const recentActivity = {};
            const previousActivity = {};

            finalRecentReviews.forEach(r => {
                const songId = r.SongId || r.songId;
                const albumId = r.AlbumId || r.albumId;
                const contentId = songId || albumId;
                if (contentId) recentActivity[contentId] = (recentActivity[contentId] || 0) + 1;
            });
            finalPreviousReviews.forEach(r => {
                const songId = r.SongId || r.songId;
                const albumId = r.AlbumId || r.albumId;
                const contentId = songId || albumId;
                if (contentId) previousActivity[contentId] = (previousActivity[contentId] || 0) + 1;
            });

            const growthRates = Object.keys(recentActivity).map(contentId => {
                const recent = recentActivity[contentId] || 0;
                const previous = previousActivity[contentId] || 0;
                const growth = previous === 0 ? (recent > 0 ? 100 : 0) : ((recent - previous) / previous) * 100;
                // Determinar si es canción o álbum basándose en las reseñas y obtener reviewIds
                const matchingReviews = finalRecentReviews.filter(r => (r.SongId || r.songId) === contentId || (r.AlbumId || r.albumId) === contentId);
                const review = matchingReviews[0];
                const contentType = (review?.SongId || review?.songId) ? 'song' : 'album';
                const reviewIds = matchingReviews.map(r => r.ReviewId || r.reviewId || r.id).filter(Boolean);
                return { contentId, contentType, growthRate: growth, recentReviews: recent, previousReviews: previous, reviewIds };
            }).sort((a, b) => b.growthRate - a.growthRate).slice(0, 10);

            const contentData = await Promise.all(
                growthRates.map(async (g) => {
                    try {
                        // Intentar obtener datos desde localStorage usando los reviewIds asociados
                        let contentDataFromStorage = null;
                        if (g.reviewIds && g.reviewIds.length > 0) {
                            for (const reviewId of g.reviewIds) {
                                const storageKey = `review_content_${reviewId}`;
                                const storedData = localStorage.getItem(storageKey);
                                if (storedData) {
                                    try {
                                        contentDataFromStorage = JSON.parse(storedData);
                                        if (contentDataFromStorage && 
                                            ((g.contentType === 'song' && contentDataFromStorage.type === 'song') ||
                                             (g.contentType === 'album' && contentDataFromStorage.type === 'album'))) {
                                            break;
                                        }
                                    } catch (e) {
                                        // Ignorar errores de parseo
                                    }
                                }
                            }
                        }
                        
                        // Si hay datos en localStorage, usarlos
                        if (contentDataFromStorage && 
                            ((g.contentType === 'song' && contentDataFromStorage.type === 'song') ||
                             (g.contentType === 'album' && contentDataFromStorage.type === 'album'))) {
                            return {
                                Title: contentDataFromStorage.name,
                                title: contentDataFromStorage.name,
                                Name: contentDataFromStorage.name,
                                ArtistName: contentDataFromStorage.artist,
                                artistName: contentDataFromStorage.artist,
                                Artist: contentDataFromStorage.artist,
                                Image: contentDataFromStorage.image,
                                image: contentDataFromStorage.image,
                                contentType: g.contentType,
                                apiSongId: contentDataFromStorage.id || contentDataFromStorage.apiSongId,
                                apiAlbumId: contentDataFromStorage.id || contentDataFromStorage.apiAlbumId
                            };
                        }
                        
                        // Si no hay datos en localStorage, intentar desde la API
                        if (g.contentType === 'song') {
                            const songData = await getSongData(g.contentId);
                            return songData ? { ...songData, contentType: 'song' } : null;
                        } else {
                            const albumData = await getAlbumData(g.contentId);
                            return albumData ? { ...albumData, contentType: 'album' } : null;
                        }
                    } catch (e) {
                        console.debug('Error obteniendo datos de contenido:', g.contentId, e);
                        return null;
                    }
                })
            );

            // Mapear resultados: si no hay datos del contenido, usar información de las reseñas
            return growthRates.map((g, i) => {
                const content = contentData[i];
                if (content && (content.Title || content.title || content.Name)) {
                    return {
                        name: content.Title || content.title || content.Name,
                        artist: content.ArtistName || content.artistName || content.Artist || 'Artista',
                        image: content.Image || content.image || null,
                        growthRate: Math.round(g.growthRate || 0),
                        recentReviews: g.recentReviews || 0,
                        previousReviews: g.previousReviews || 0,
                        contentType: g.contentType || 'song',
                        apiSongId: content.apiSongId || content.APISongId || content.id,
                        apiAlbumId: content.apiAlbumId || content.APIAlbumId || content.id
                    };
                } else {
                    return {
                        name: `${g.contentType === 'song' ? 'Canción' : 'Álbum'} (+${Math.round(g.growthRate)}%)`,
                        artist: 'En tendencia',
                        image: null,
                        growthRate: Math.round(g.growthRate || 0),
                        recentReviews: g.recentReviews || 0,
                        previousReviews: g.previousReviews || 0,
                        contentType: g.contentType || 'song',
                        apiSongId: null,
                        apiAlbumId: null
                    };
                }
            });
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

    // Función auxiliar para obtener el badge de información según la categoría (minimalista, lado derecho)
    const getCategoryBadge = (item, categoryId) => {
        if (categoryId === 'lo-mas-recomendado') {
            const avgRating = item.avgRating || 0;
            return `
                <div style="display: flex; align-items: center; gap: 0.5rem; color: #FFD700; font-size: 0.9rem;">
                    <span style="font-weight: 600;">${avgRating.toFixed(1)}</span>
                    <span style="font-size: 0.85rem;">★</span>
                </div>
            `;
        } else if (categoryId === 'lo-mas-comentado') {
            const totalComments = item.totalComments || 0;
            return `
                <div style="display: flex; align-items: center; gap: 0.5rem; color: #EC4899; font-size: 0.9rem;">
                    <span style="font-weight: 600;">${totalComments}</span>
                    <span style="font-size: 0.85rem; opacity: 0.7;">💬</span>
                </div>
            `;
        } else if (categoryId === 'top-10-semana' || categoryId === 'top-50-mes') {
            const avgRating = item.avgRating || 0;
            const comments = item.totalComments || 0;
            const likes = item.totalLikes || 0;
            const period = categoryId === 'top-10-semana' ? 'Esta semana' : 'Este mes';
            const ratingText = avgRating > 0 ? avgRating.toFixed(1) : '0.0';
            
            return `
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; color: #3B82F6; font-size: 0.85rem; text-align: right;">
                    <div style="display: flex; align-items: center; gap: 0.25rem;">
                        <span style="font-weight: 600;">${ratingText}</span>
                        <span style="font-size: 0.75rem;">⭐</span>
                        <span style="opacity: 0.7;">•</span>
                        <span>${comments} comentario${comments !== 1 ? 's' : ''}</span>
                        <span style="opacity: 0.7;">•</span>
                        <span>${likes} like${likes !== 1 ? 's' : ''}</span>
                    </div>
                    <div style="font-size: 0.75rem; opacity: 0.8;">${period}</div>
                </div>
            `;
        } else if (categoryId === 'trending') {
            const growthRate = item.growthRate || 0;
            const recentReviews = item.recentReviews || 0;
            return `
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; color: #22C55E; font-size: 0.85rem; text-align: right;">
                    <div style="display: flex; align-items: center; gap: 0.25rem; flex-wrap: wrap; justify-content: flex-end;">
                        <span style="font-weight: 600;">+${recentReviews}</span>
                        <span>reseña${recentReviews !== 1 ? 's' : ''} en las últimas 24h</span>
                        <span style="opacity: 0.7;">•</span>
                        <span style="font-weight: 600;">+${Math.round(growthRate)}%</span>
                        <span>crecimiento</span>
                    </div>
                </div>
            `;
        }
        return '';
    };

    // Cargar contenido de forma asíncrona
    loadCarouselContent(categoryId, categoryData).then(content => {
        if (contentListEl) {
            if (content && content.length > 0) {
                // Renderizar lista de contenido con imágenes reales de las canciones
                contentListEl.innerHTML = content.map((item, index) => {
                    // Usar imagen real de la canción/álbum si está disponible, sino usar default
                    const image = item.image || item.albumImage || item.artistImage || item.Image || '../Assets/default-avatar.png';
                    const name = item.name || item.title || item.Name || item.Title || 'Sin nombre';
                    const artist = item.artist || item.artistName || item.ArtistName || 'Artista desconocido';
                    const contentType = item.contentType || 'song';
                    const apiSongId = item.apiSongId || item.APISongId;
                    const apiAlbumId = item.apiAlbumId || item.APIAlbumId;
                    
                    // Determinar la URL de navegación
                    let navigationUrl = '#';
                    if (contentType === 'song' && apiSongId) {
                        navigationUrl = `song.html?id=${encodeURIComponent(apiSongId)}`;
                    } else if (contentType === 'album' && apiAlbumId) {
                        navigationUrl = `album.html?id=${encodeURIComponent(apiAlbumId)}`;
                    }
                    
                    // Obtener el badge según la categoría
                    const categoryBadge = getCategoryBadge(item, categoryId);
                    
                    return `
                        <div class="carousel-content-item" 
                             data-content-type="${contentType}"
                             data-api-song-id="${apiSongId || ''}"
                             data-api-album-id="${apiAlbumId || ''}"
                             style="padding: 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; gap: 1rem; cursor: ${navigationUrl !== '#' ? 'pointer' : 'default'};"
                             ${navigationUrl !== '#' ? `onclick="window.location.href='${navigationUrl}'"` : ''}>
                            <img src="${image}" alt="${name}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;" onerror="this.src='../Assets/default-avatar.png'">
                            <div style="flex: 1;">
                                <h4 style="color: #fff; margin: 0 0 0.25rem 0; font-size: 1rem;">${name}</h4>
                                <p style="color: rgba(255, 255, 255, 0.6); margin: 0; font-size: 0.9rem;">${artist}</p>
                            </div>
                            ${categoryBadge}
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

