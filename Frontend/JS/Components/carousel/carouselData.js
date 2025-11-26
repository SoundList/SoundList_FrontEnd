/**
 * Módulo de datos del carrusel
 * Funciones para obtener datos de rankings (más recomendado, más comentado, top 10, etc.)
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
        // Primero intentar con getSongById (GUID interno)
        const songData = await getSongById(songId);
        if (songData && (songData.Title || songData.title)) {
            // Si getSongById devuelve datos completos, usarlos
            return songData;
        }
        
        // Si getSongById devolvió datos pero sin título, obtener el apiSongId
        if (songData) {
            const apiSongId = songData.apiSongId || songData.APISongId;
            if (apiSongId) {
                const fullSongData = await getSongByApiId(apiSongId);
                return fullSongData || songData;
            }
        }
        
        // Si getSongById falló o no devolvió datos, intentar directamente con getSongByApiId
        // (por si acaso el songId es un apiSongId)
        return await getSongByApiId(songId);
    } catch (e) {
        console.debug('Error obteniendo datos de canción:', songId, e);
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
 * LO MÁS RECOMENDADO
 * Lógica: Promedio de calificaciones (mínimo 10 reseñas)
 */
export async function getMasRecomendado() {
    try {
        // Obtener todas las reseñas
        const reviews = await getReviews();
        console.log('🔍 getMasRecomendado: Reseñas obtenidas:', reviews?.length || 0);
        if (!reviews || reviews.length === 0) {
            return {
                totalSongs: 0,
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
        }

        // Agrupar reseñas por SongId o AlbumId (canciones y álbumes)
        const contentMap = {};
        reviews.forEach(review => {
            const songId = review.SongId || review.songId;
            const albumId = review.AlbumId || review.albumId;
            const contentId = songId || albumId;
            const contentType = songId ? 'song' : 'album';
            
            if (!contentId) return;

            if (!contentMap[contentId]) {
                contentMap[contentId] = {
                    contentId: contentId,
                    contentType: contentType,
                    ratings: [],
                    reviewIds: []
                };
            }
            const rating = review.Rating || review.rating || 0;
            contentMap[contentId].ratings.push(rating);
            contentMap[contentId].reviewIds.push(review.ReviewId || review.reviewId || review.id);
        });

        // Calcular promedio de rating para cada canción/álbum
        // Si hay pocas reseñas en total, mostrar todas las canciones/álbumes con al menos 1 reseña
        // Si hay muchas reseñas, usar mínimo 10 por contenido para mejor calidad
        const totalReviewsCount = reviews.length;
        const minReviews = totalReviewsCount < 50 ? 1 : 10; // Flexible: mínimo 1 si hay pocas reseñas totales
        
        console.log('🔍 getMasRecomendado: Contenido agrupado:', Object.keys(contentMap).length, 'items');
        console.log('🔍 getMasRecomendado: minReviews requerido:', minReviews);
        
        const contentWithAvg = Object.values(contentMap)
            .filter(content => content.ratings.length >= minReviews)
            .map(content => ({
                ...content,
                avgRating: content.ratings.reduce((a, b) => a + b, 0) / content.ratings.length,
                totalReviews: content.ratings.length
            }))
            .sort((a, b) => {
                // Ordenar primero por promedio de rating, luego por cantidad de reseñas
                if (Math.abs(b.avgRating - a.avgRating) < 0.1) {
                    return b.totalReviews - a.totalReviews;
                }
                return b.avgRating - a.avgRating;
            });

        console.log('🔍 getMasRecomendado: Contenido filtrado (minReviews=' + minReviews + '):', contentWithAvg.length, 'items');
        
        if (contentWithAvg.length === 0) {
            return {
                totalSongs: Object.keys(contentMap).length,
                minReviews: minReviews,
                topSong: {
                    name: 'No hay suficientes reseñas',
                    artist: totalReviewsCount < 50 
                        ? 'Crea más reseñas para ver resultados' 
                        : `Mínimo ${minReviews} reseñas por canción/álbum`,
                    avgRating: 0,
                    totalReviews: 0,
                    albumImage: null,
                    artistImage: null
                }
            };
        }

        const topContent = contentWithAvg[0];
        console.log('🔍 getMasRecomendado: Top contenido:', topContent);
        
        // Obtener datos del contenido (canción o álbum)
        let contentData = null;
        if (topContent.contentType === 'song') {
            console.log('🔍 Obteniendo datos de canción:', topContent.contentId);
            contentData = await getSongData(topContent.contentId);
            console.log('🔍 Datos de canción obtenidos:', contentData ? 'OK' : 'NULL');
        } else {
            console.log('🔍 Obteniendo datos de álbum:', topContent.contentId);
            // Para álbumes, usar getAlbumById y luego getAlbumByApiId si es necesario
            try {
                const albumData = await getAlbumById(topContent.contentId);
                if (albumData && (albumData.Title || albumData.title)) {
                    contentData = albumData;
                } else if (albumData) {
                    const apiAlbumId = albumData.apiAlbumId || albumData.APIAlbumId;
                    if (apiAlbumId) {
                        const fullAlbumData = await getAlbumByApiId(apiAlbumId);
                        contentData = fullAlbumData || albumData;
                    }
                } else {
                    contentData = await getAlbumByApiId(topContent.contentId);
                }
            } catch (e) {
                console.debug('Error obteniendo datos de álbum:', topContent.contentId, e);
                contentData = null;
            }
        }

        // Si no se pudieron obtener datos del contenido, usar valores por defecto pero mostrar la información de la reseña
        let displayName = contentData?.Title || contentData?.title || contentData?.Name;
        let displayArtist = contentData?.ArtistName || contentData?.artistName || contentData?.Artist;
        const displayImage = contentData?.Image || contentData?.image || null;
        
        // Si no hay datos del contenido, mostrar información útil basada en las reseñas
        if (!displayName) {
            displayName = `${topContent.contentType === 'song' ? 'Canción' : 'Álbum'} con ${topContent.totalReviews} ${topContent.totalReviews === 1 ? 'reseña' : 'reseñas'}`;
        }
        if (!displayArtist) {
            displayArtist = `Promedio: ${topContent.avgRating.toFixed(1)} ⭐`;
        }
        
        console.log('🔍 getMasRecomendado: Datos finales:', {
            name: displayName,
            artist: displayArtist,
            avgRating: topContent.avgRating,
            totalReviews: topContent.totalReviews,
            hasImage: !!displayImage,
            hasContentData: !!contentData
        });
        
        return {
            totalSongs: contentWithAvg.length,
            minReviews: minReviews,
            topSong: {
                name: displayName,
                artist: displayArtist,
                avgRating: topContent.avgRating,
                totalReviews: topContent.totalReviews,
                albumImage: displayImage,
                artistImage: null
            }
        };
    } catch (error) {
        console.error('Error obteniendo más recomendado:', error);
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
 */
export async function getMasComentado() {
    try {
        // Obtener todas las reseñas
        const reviews = await getReviews();
        if (!reviews || reviews.length === 0) {
            return {
                totalSongs: 0,
                topSong: {
                    name: 'No hay datos aún',
                    artist: 'Crea reseñas y comenta para ver resultados',
                    totalReviews: 0,
                    totalComments: 0,
                    albumImage: null,
                    artistImage: null
                }
            };
        }

        // Agrupar reseñas por SongId y contar comentarios
        const songsMap = {};
        const reviewIds = reviews.map(r => r.ReviewId || r.reviewId || r.id).filter(Boolean);

        // Obtener comentarios para todas las reseñas en paralelo
        const commentsPromises = reviewIds.map(reviewId => 
            getCommentsByReview(reviewId).catch(() => [])
        );
        const commentsArrays = await Promise.all(commentsPromises);

        // Mapear comentarios por reviewId
        const commentsByReview = {};
        reviewIds.forEach((reviewId, index) => {
            commentsByReview[reviewId] = commentsArrays[index] || [];
        });

        // Agrupar por canción y contar comentarios
        reviews.forEach(review => {
            const songId = review.SongId || review.songId;
            if (!songId) return;

            const reviewId = review.ReviewId || review.reviewId || review.id;
            const comments = commentsByReview[reviewId] || [];

            if (!songsMap[songId]) {
                songsMap[songId] = {
                    songId: songId,
                    totalComments: 0,
                    totalReviews: 0,
                    reviewIds: []
                };
            }
            songsMap[songId].totalComments += comments.length;
            songsMap[songId].totalReviews += 1;
            songsMap[songId].reviewIds.push(reviewId);
        });

        // Ordenar por total de comentarios
        const songsSorted = Object.values(songsMap)
            .sort((a, b) => b.totalComments - a.totalComments);

        if (songsSorted.length === 0 || songsSorted[0].totalComments === 0) {
            return {
                totalSongs: Object.keys(songsMap).length,
                topSong: {
                    name: 'No hay comentarios aún',
                    artist: 'Crea reseñas y comenta para ver resultados',
                    totalReviews: 0,
                    totalComments: 0,
                    albumImage: null,
                    artistImage: null
                }
            };
        }

        const topSong = songsSorted[0];
        // Obtener datos de la canción usando la función auxiliar
        const songData = await getSongData(topSong.songId);

        return {
            totalSongs: songsSorted.length,
            topSong: {
                name: songData?.Title || songData?.title || songData?.Name || 'Canción',
                artist: songData?.ArtistName || songData?.artistName || songData?.Artist || 'Artista',
                totalReviews: topSong.totalReviews,
                totalComments: topSong.totalComments,
                albumImage: songData?.Image || songData?.image || null,
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
export async function getTop10Semana() {
    try {
        const reviews = await getReviews();
        if (!reviews || reviews.length === 0) {
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
        }

        // Filtrar reseñas de la última semana
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const weekReviews = reviews.filter(review => {
            const createdAt = new Date(review.CreatedAt || review.Created || review.createdAt);
            return createdAt >= oneWeekAgo;
        });

        if (weekReviews.length === 0) {
            return {
                period: 'semana',
                limit: 10,
                topSong: {
                    name: 'No hay reseñas esta semana',
                    artist: 'Crea reseñas para ver resultados',
                    score: 0,
                    albumImage: null,
                    artistImage: null
                }
            };
        }

        // Agrupar por canción/álbum y calcular score
        const contentMap = {};
        
        // Filtrar reseñas que tienen ID válido y obtener sus IDs
        const validReviews = weekReviews.filter(r => {
            const reviewId = r.ReviewId || r.reviewId || r.id;
            return reviewId && (r.SongId || r.songId || r.AlbumId || r.albumId);
        });
        const reviewIds = validReviews.map(r => r.ReviewId || r.reviewId || r.id);

        console.log(`📊 TOP 10 SEMANA: Reseñas válidas: ${validReviews.length}, ReviewIds: ${reviewIds.length}`);
        console.log(`📊 TOP 10 SEMANA: ReviewIds:`, reviewIds);
        
        // Obtener comentarios y likes en paralelo solo para reseñas válidas
        const [commentsArrays, likesArrays] = await Promise.all([
            Promise.all(reviewIds.map(id => getCommentsByReview(id).catch((err) => {
                console.warn(`⚠️ TOP 10 SEMANA: Error obteniendo comentarios para review ${id}:`, err);
                return [];
            }))),
            Promise.all(reviewIds.map((id, idx) => {
                return getReviewReactionCount(id)
                    .then((count) => {
                        console.log(`✅ TOP 10 SEMANA: Review ${id} -> ${count} likes`);
                        return count;
                    })
                    .catch((err) => {
                        console.error(`❌ TOP 10 SEMANA: Error obteniendo likes para review ${id}:`, err);
                        console.error(`❌ TOP 10 SEMANA: Error details:`, err.response?.data || err.message);
                        return 0;
                    });
            }))
        ]);
        
        console.log(`📊 TOP 10 SEMANA: Likes obtenidos:`, likesArrays);

        validReviews.forEach((review, index) => {
            const songId = review.SongId || review.songId;
            const albumId = review.AlbumId || review.albumId;
            const contentId = songId || albumId;
            const contentType = songId ? 'song' : 'album';
            
            if (!contentId) return;

            if (!contentMap[contentId]) {
                contentMap[contentId] = {
                    contentId: contentId,
                    contentType: contentType,
                    songId: songId,
                    albumId: albumId,
                    totalRating: 0,
                    reviewCount: 0,
                    totalComments: 0,
                    totalLikes: 0
                };
            }
            
            const commentsCount = commentsArrays[index]?.length || 0;
            const likesCount = likesArrays[index] || 0;
            
            contentMap[contentId].totalRating += (review.Rating || review.rating || 0);
            contentMap[contentId].reviewCount += 1;
            contentMap[contentId].totalComments += commentsCount;
            contentMap[contentId].totalLikes += likesCount;
            
            const reviewId = review.ReviewId || review.reviewId || review.id;
            console.log(`📊 TOP 10 SEMANA: Review ${reviewId} -> Content ${contentId} (${contentType}): ${likesCount} likes, ${commentsCount} comentarios`);
        });
        
        // Log del contenido agrupado
        Object.values(contentMap).forEach(content => {
            console.log(`📊 TOP 10 SEMANA: Content ${content.contentId} (${content.contentType}): ${content.totalLikes} likes totales, ${content.totalComments} comentarios totales`);
        });

        // Calcular score: (avgRating * 2) + (comments * 0.5) + (likes * 0.3)
        const contentWithScore = Object.values(contentMap).map(content => ({
            ...content,
            avgRating: content.totalRating / content.reviewCount,
            score: (content.totalRating / content.reviewCount) * 2 + content.totalComments * 0.5 + content.totalLikes * 0.3
        })).sort((a, b) => b.score - a.score).slice(0, 10);

        if (contentWithScore.length === 0) {
            return {
                period: 'semana',
                limit: 10,
                topSong: {
                    name: 'No hay datos suficientes',
                    artist: 'Esta semana',
                    score: 0,
                    avgRating: 0,
                    reviewCount: 0,
                    totalComments: 0,
                    totalLikes: 0,
                    albumImage: null,
                    artistImage: null
                }
            };
        }

        const topContent = contentWithScore[0];
        let contentData = null;
        try {
            if (topContent.contentType === 'song') {
                contentData = await getSongData(topContent.contentId);
            } else {
                contentData = await getAlbumData(topContent.contentId);
            }
        } catch (e) {
            console.debug('No se pudo obtener datos del contenido:', topContent.contentId, e);
        }

        return {
            period: 'semana',
            limit: 10,
            topSong: {
                name: contentData?.Title || contentData?.title || contentData?.Name || (topContent.contentType === 'song' ? 'Canción' : 'Álbum'),
                artist: contentData?.ArtistName || contentData?.artistName || contentData?.Artist || 'Artista',
                score: topContent.score,
                avgRating: topContent.avgRating,
                reviewCount: topContent.reviewCount,
                totalComments: topContent.totalComments,
                totalLikes: topContent.totalLikes,
                albumImage: contentData?.Image || contentData?.image || null,
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
export async function getTop50Mes() {
    try {
        const reviews = await getReviews();
        if (!reviews || reviews.length === 0) {
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
        }

        // Filtrar reseñas del último mes
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const monthReviews = reviews.filter(review => {
            const createdAt = new Date(review.CreatedAt || review.Created || review.createdAt);
            return createdAt >= oneMonthAgo;
        });

        if (monthReviews.length === 0) {
            return {
                period: 'mes',
                limit: 50,
                topSong: {
                    name: 'No hay reseñas este mes',
                    artist: 'Crea reseñas para ver resultados',
                    score: 0,
                    albumImage: null,
                    artistImage: null
                }
            };
        }

        // Agrupar por canción/álbum y calcular score
        const contentMap = {};
        
        // Filtrar reseñas que tienen ID válido y obtener sus IDs
        const validReviews = monthReviews.filter(r => {
            const reviewId = r.ReviewId || r.reviewId || r.id;
            return reviewId && (r.SongId || r.songId || r.AlbumId || r.albumId);
        });
        const reviewIds = validReviews.map(r => r.ReviewId || r.reviewId || r.id);

        console.log(`📊 TOP 50 MES: Reseñas válidas: ${validReviews.length}, ReviewIds: ${reviewIds.length}`);
        console.log(`📊 TOP 50 MES: ReviewIds:`, reviewIds);
        
        const [commentsArrays, likesArrays] = await Promise.all([
            Promise.all(reviewIds.map(id => getCommentsByReview(id).catch((err) => {
                console.warn(`⚠️ TOP 50 MES: Error obteniendo comentarios para review ${id}:`, err);
                return [];
            }))),
            Promise.all(reviewIds.map((id, idx) => {
                return getReviewReactionCount(id)
                    .then((count) => {
                        console.log(`✅ TOP 50 MES: Review ${id} -> ${count} likes`);
                        return count;
                    })
                    .catch((err) => {
                        console.error(`❌ TOP 50 MES: Error obteniendo likes para review ${id}:`, err);
                        console.error(`❌ TOP 50 MES: Error details:`, err.response?.data || err.message);
                        return 0;
                    });
            }))
        ]);
        
        console.log(`📊 TOP 50 MES: Likes obtenidos:`, likesArrays);

        validReviews.forEach((review, index) => {
            const songId = review.SongId || review.songId;
            const albumId = review.AlbumId || review.albumId;
            const contentId = songId || albumId;
            const contentType = songId ? 'song' : 'album';
            
            if (!contentId) return;

            if (!contentMap[contentId]) {
                contentMap[contentId] = {
                    contentId: contentId,
                    contentType: contentType,
                    songId: songId,
                    albumId: albumId,
                    totalRating: 0,
                    reviewCount: 0,
                    totalComments: 0,
                    totalLikes: 0
                };
            }
            
            const commentsCount = commentsArrays[index]?.length || 0;
            const likesCount = likesArrays[index] || 0;
            
            contentMap[contentId].totalRating += (review.Rating || review.rating || 0);
            contentMap[contentId].reviewCount += 1;
            contentMap[contentId].totalComments += commentsCount;
            contentMap[contentId].totalLikes += likesCount;
            
            const reviewId = review.ReviewId || review.reviewId || review.id;
            console.log(`📊 TOP 50 MES: Review ${reviewId} -> Content ${contentId} (${contentType}): ${likesCount} likes, ${commentsCount} comentarios`);
        });
        
        // Log del contenido agrupado
        Object.values(contentMap).forEach(content => {
            console.log(`📊 TOP 50 MES: Content ${content.contentId} (${content.contentType}): ${content.totalLikes} likes totales, ${content.totalComments} comentarios totales`);
        });

        const contentWithScore = Object.values(contentMap).map(content => ({
            ...content,
            avgRating: content.totalRating / content.reviewCount,
            score: (content.totalRating / content.reviewCount) * 2 + content.totalComments * 0.5 + content.totalLikes * 0.3
        })).sort((a, b) => b.score - a.score).slice(0, 50);

        if (contentWithScore.length === 0) {
            return {
                period: 'mes',
                limit: 50,
                topSong: {
                    name: 'No hay datos suficientes',
                    artist: 'Este mes',
                    score: 0,
                    avgRating: 0,
                    reviewCount: 0,
                    totalComments: 0,
                    totalLikes: 0,
                    albumImage: null,
                    artistImage: null
                }
            };
        }

        const topContent = contentWithScore[0];
        let contentData = null;
        try {
            if (topContent.contentType === 'song') {
                contentData = await getSongData(topContent.contentId);
            } else {
                contentData = await getAlbumData(topContent.contentId);
            }
        } catch (e) {
            console.debug('No se pudo obtener datos del contenido:', topContent.contentId, e);
        }

        return {
            period: 'mes',
            limit: 50,
            topSong: {
                name: contentData?.Title || contentData?.title || contentData?.Name || (topContent.contentType === 'song' ? 'Canción' : 'Álbum'),
                artist: contentData?.ArtistName || contentData?.artistName || contentData?.Artist || 'Artista',
                score: topContent.score,
                avgRating: topContent.avgRating,
                reviewCount: topContent.reviewCount,
                totalComments: topContent.totalComments,
                totalLikes: topContent.totalLikes,
                albumImage: contentData?.Image || contentData?.image || null,
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
 * Lógica: Canciones/álbumes con mayor crecimiento de actividad en las últimas 24 horas (del día)
 */
export async function getTrending() {
    try {
        const reviews = await getReviews();
        if (!reviews || reviews.length === 0) {
            return {
                timeWindow: '24 horas',
                topSong: {
                    name: 'No hay datos aún',
                    artist: 'Crea reseñas para ver tendencias',
                    growthRate: 0,
                    albumImage: null,
                    artistImage: null
                }
            };
        }

        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

        // Filtrar reseñas de los dos períodos con validación de fechas
        let recentReviews = reviews.filter(r => {
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
        let previousReviews = reviews.filter(r => {
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

        // Si no hay reseñas recientes, usar las más recientes disponibles como fallback
        if (recentReviews.length === 0) {
            console.log(`⚠️ getTrending: No hay reseñas en las últimas 24h, usando las más recientes disponibles`);
            
            // Procesar todas las reseñas con fallback a timestamps de localStorage o índice
            const processedReviews = reviews.map((r, index) => {
                const dateStr = r.CreatedAt || r.Created || r.createdAt || r.date || r.Date;
                let timestamp = null;
                
                if (dateStr) {
                    const date = new Date(dateStr);
                    const ts = date.getTime();
                    const isValid = !isNaN(ts) && ts > 0 && 
                                   date.getFullYear() > 1 &&
                                   !dateStr.toString().includes('0001-01-01');
                    
                    if (isValid) {
                        timestamp = ts;
                    }
                }
                
                // Si no tiene fecha válida, intentar usar timestamp de localStorage
                if (!timestamp) {
                    const reviewId = r.ReviewId || r.reviewId || r.id;
                    const storageTimestamp = localStorage.getItem(`review_created_at_${reviewId}`);
                    if (storageTimestamp) {
                        const ts = parseInt(storageTimestamp, 10);
                        if (!isNaN(ts) && ts > 0) {
                            timestamp = ts;
                        }
                    }
                }
                
                // Fallback final: usar índice (las primeras en el array son más recientes)
                if (!timestamp) {
                    timestamp = (reviews.length - index) * 1000000;
                }
                
                return { review: r, timestamp };
            }).sort((a, b) => b.timestamp - a.timestamp).map(item => item.review);
            
            // Usar las 10 más recientes como "recentReviews" y las siguientes 10 como "previousReviews"
            recentReviews = processedReviews.slice(0, 10);
            previousReviews = processedReviews.slice(10, 20);
            
            if (recentReviews.length === 0) {
                return {
                    timeWindow: '24 horas',
                    topSong: {
                        name: 'No hay actividad reciente',
                        artist: 'Últimas 24 horas',
                        growthRate: 0,
                        albumImage: null,
                        artistImage: null
                    }
                };
            }
            
            console.log(`📊 getTrending: Usando ${recentReviews.length} reseñas más recientes como fallback`);
        }

        // Calcular actividad por canción/álbum en ambos períodos
        const recentActivity = {};
        const previousActivity = {};

        const processPeriod = (reviewList, activityMap) => {
            reviewList.forEach(review => {
                const songId = review.SongId || review.songId;
                const albumId = review.AlbumId || review.albumId;
                const contentId = songId || albumId;
                if (!contentId) return;
                if (!activityMap[contentId]) {
                    activityMap[contentId] = { reviews: 0, comments: 0, likes: 0 };
                }
                activityMap[contentId].reviews += 1;
            });
        };

        processPeriod(recentReviews, recentActivity);
        processPeriod(previousReviews, previousActivity);

        // Calcular crecimiento específicamente de reseñas (no combinado)
        const growthRates = {};
        Object.keys(recentActivity).forEach(contentId => {
            const recent = recentActivity[contentId];
            const previous = previousActivity[contentId] || { reviews: 0, comments: 0, likes: 0 };
            const recentReviewsCount = recent.reviews;
            const previousReviewsCount = previous.reviews;
            
            let growth = 0;
            if (previousReviewsCount === 0) {
                growth = recentReviewsCount > 0 ? 100 : 0; // 100% si no había reseñas antes
            } else {
                growth = ((recentReviewsCount - previousReviewsCount) / previousReviewsCount) * 100;
            }
            
            growthRates[contentId] = {
                growthRate: growth,
                recentReviews: recentReviewsCount,
                previousReviews: previousReviewsCount
            };
        });

        // Ordenar por crecimiento
        const sorted = Object.entries(growthRates)
            .sort((a, b) => b[1].growthRate - a[1].growthRate);

        if (sorted.length === 0) {
            return {
                timeWindow: '24 horas',
                topSong: {
                    name: 'No hay tendencias',
                    artist: 'Últimas 24 horas',
                    growthRate: 0,
                    albumImage: null,
                    artistImage: null
                }
            };
        }

        const [topContentId, growthData] = sorted[0];
        // Determinar si es canción o álbum y obtener datos
        const matchingReview = recentReviews.find(r => (r.SongId || r.songId) === topContentId || (r.AlbumId || r.albumId) === topContentId);
        const contentType = (matchingReview?.SongId || matchingReview?.songId) ? 'song' : 'album';
        
        let contentData = null;
        try {
            if (contentType === 'song') {
                contentData = await getSongData(topContentId);
            } else {
                contentData = await getAlbumData(topContentId);
            }
        } catch (e) {
            console.debug('No se pudo obtener datos del contenido:', topContentId, e);
        }

        return {
            timeWindow: '24 horas',
            topSong: {
                name: contentData?.Title || contentData?.title || contentData?.Name || (contentType === 'song' ? 'Canción' : 'Álbum'),
                artist: contentData?.ArtistName || contentData?.artistName || contentData?.Artist || 'Artista',
                growthRate: Math.round(growthData.growthRate),
                recentReviews: growthData.recentReviews || 0,
                previousReviews: growthData.previousReviews || 0,
                albumImage: contentData?.Image || contentData?.image || null,
                artistImage: null
            }
        };
    } catch (error) {
        console.error('Error obteniendo trending:', error);
        return {
            timeWindow: '24 horas',
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

/**
 * Carga todos los datos del carrusel
 */
export async function loadCarouselData() {
    try {
        console.log('🚀 loadCarouselData: Iniciando carga de datos del carrusel...');
        const [masRecomendado, masComentado, top10Semana, top50Mes, trending] = await Promise.all([
            getMasRecomendado(),
            getMasComentado(),
            getTop10Semana(),
            getTop50Mes(),
            getTrending()
        ]);

        console.log('🚀 loadCarouselData: Datos cargados:', {
            masRecomendado: masRecomendado?.topSong?.name || 'sin datos',
            masComentado: masComentado?.topSong?.name || 'sin datos',
            top10Semana: top10Semana?.topSong?.name || 'sin datos',
            top50Mes: top50Mes?.topSong?.name || 'sin datos',
            trending: trending?.topSong?.name || 'sin datos'
        });

        return {
            'lo-mas-recomendado': masRecomendado,
            'lo-mas-comentado': masComentado,
            'top-10-semana': top10Semana,
            'top-50-mes': top50Mes,
            'trending': trending
        };
    } catch (error) {
        console.error('❌ Error cargando datos del carrusel:', error);
        return null;
    }
}

