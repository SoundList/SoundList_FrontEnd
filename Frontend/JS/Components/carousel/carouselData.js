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

        // Agrupar por canción y calcular score
        const songsMap = {};
        const reviewIds = weekReviews.map(r => r.ReviewId || r.reviewId || r.id).filter(Boolean);

        // Obtener comentarios y likes en paralelo
        const [commentsArrays, likesArrays] = await Promise.all([
            Promise.all(reviewIds.map(id => getCommentsByReview(id).catch(() => []))),
            Promise.all(reviewIds.map(id => getReviewReactionCount(id).catch(() => 0)))
        ]);

        weekReviews.forEach((review, index) => {
            const songId = review.SongId || review.songId;
            if (!songId) return;

            if (!songsMap[songId]) {
                songsMap[songId] = {
                    songId: songId,
                    totalRating: 0,
                    reviewCount: 0,
                    totalComments: 0,
                    totalLikes: 0
                };
            }
            songsMap[songId].totalRating += (review.Rating || review.rating || 0);
            songsMap[songId].reviewCount += 1;
            songsMap[songId].totalComments += (commentsArrays[index]?.length || 0);
            songsMap[songId].totalLikes += (likesArrays[index] || 0);
        });

        // Calcular score: (avgRating * 2) + (comments * 0.5) + (likes * 0.3)
        const songsWithScore = Object.values(songsMap).map(song => ({
            ...song,
            avgRating: song.totalRating / song.reviewCount,
            score: (song.totalRating / song.reviewCount) * 2 + song.totalComments * 0.5 + song.totalLikes * 0.3
        })).sort((a, b) => b.score - a.score).slice(0, 10);

        if (songsWithScore.length === 0) {
            return {
                period: 'semana',
                limit: 10,
                topSong: {
                    name: 'No hay datos suficientes',
                    artist: 'Esta semana',
                    score: 0,
                    albumImage: null,
                    artistImage: null
                }
            };
        }

        const topSong = songsWithScore[0];
        let songData = null;
        try {
            songData = await getSongByApiId(topSong.songId);
        } catch (e) {
            console.debug('No se pudo obtener datos de la canción:', topSong.songId);
        }

        return {
            period: 'semana',
            limit: 10,
            topSong: {
                name: songData?.Title || songData?.title || songData?.Name || 'Canción',
                artist: songData?.ArtistName || songData?.artistName || songData?.Artist || 'Artista',
                score: topSong.score,
                albumImage: songData?.Image || songData?.image || null,
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

        // Agrupar por canción y calcular score
        const songsMap = {};
        const reviewIds = monthReviews.map(r => r.ReviewId || r.reviewId || r.id).filter(Boolean);

        const [commentsArrays, likesArrays] = await Promise.all([
            Promise.all(reviewIds.map(id => getCommentsByReview(id).catch(() => []))),
            Promise.all(reviewIds.map(id => getReviewReactionCount(id).catch(() => 0)))
        ]);

        monthReviews.forEach((review, index) => {
            const songId = review.SongId || review.songId;
            if (!songId) return;

            if (!songsMap[songId]) {
                songsMap[songId] = {
                    songId: songId,
                    totalRating: 0,
                    reviewCount: 0,
                    totalComments: 0,
                    totalLikes: 0
                };
            }
            songsMap[songId].totalRating += (review.Rating || review.rating || 0);
            songsMap[songId].reviewCount += 1;
            songsMap[songId].totalComments += (commentsArrays[index]?.length || 0);
            songsMap[songId].totalLikes += (likesArrays[index] || 0);
        });

        const songsWithScore = Object.values(songsMap).map(song => ({
            ...song,
            avgRating: song.totalRating / song.reviewCount,
            score: (song.totalRating / song.reviewCount) * 2 + song.totalComments * 0.5 + song.totalLikes * 0.3
        })).sort((a, b) => b.score - a.score).slice(0, 50);

        if (songsWithScore.length === 0) {
            return {
                period: 'mes',
                limit: 50,
                topSong: {
                    name: 'No hay datos suficientes',
                    artist: 'Este mes',
                    score: 0,
                    albumImage: null,
                    artistImage: null
                }
            };
        }

        const topSong = songsWithScore[0];
        let songData = null;
        try {
            songData = await getSongByApiId(topSong.songId);
        } catch (e) {
            console.debug('No se pudo obtener datos de la canción:', topSong.songId);
        }

        return {
            period: 'mes',
            limit: 50,
            topSong: {
                name: songData?.Title || songData?.title || songData?.Name || 'Canción',
                artist: songData?.ArtistName || songData?.artistName || songData?.Artist || 'Artista',
                score: topSong.score,
                albumImage: songData?.Image || songData?.image || null,
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
 */
export async function getTrending() {
    try {
        const reviews = await getReviews();
        if (!reviews || reviews.length === 0) {
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
        }

        const now = new Date();
        const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        const last96h = new Date(now.getTime() - 96 * 60 * 60 * 1000);

        // Filtrar reseñas de los dos períodos
        const recentReviews = reviews.filter(r => {
            const date = new Date(r.CreatedAt || r.Created || r.createdAt);
            return date >= last48h;
        });
        const previousReviews = reviews.filter(r => {
            const date = new Date(r.CreatedAt || r.Created || r.createdAt);
            return date >= last96h && date < last48h;
        });

        if (recentReviews.length === 0) {
            return {
                timeWindow: '48 horas',
                topSong: {
                    name: 'No hay actividad reciente',
                    artist: 'Últimas 48 horas',
                    growthRate: 0,
                    albumImage: null,
                    artistImage: null
                }
            };
        }

        // Calcular actividad por canción en ambos períodos
        const recentActivity = {};
        const previousActivity = {};

        const processPeriod = (reviewList, activityMap) => {
            reviewList.forEach(review => {
                const songId = review.SongId || review.songId;
                if (!songId) return;
                if (!activityMap[songId]) {
                    activityMap[songId] = { reviews: 0, comments: 0, likes: 0 };
                }
                activityMap[songId].reviews += 1;
            });
        };

        processPeriod(recentReviews, recentActivity);
        processPeriod(previousReviews, previousActivity);

        // Calcular crecimiento
        const growthRates = {};
        Object.keys(recentActivity).forEach(songId => {
            const recent = recentActivity[songId];
            const previous = previousActivity[songId] || { reviews: 0, comments: 0, likes: 0 };
            const recentTotal = recent.reviews + recent.comments + recent.likes;
            const previousTotal = previous.reviews + previous.comments + previous.likes;
            
            if (previousTotal === 0) {
                growthRates[songId] = recentTotal > 0 ? 100 : 0; // 100% si no había actividad antes
            } else {
                growthRates[songId] = ((recentTotal - previousTotal) / previousTotal) * 100;
            }
        });

        // Ordenar por crecimiento
        const sorted = Object.entries(growthRates)
            .sort((a, b) => b[1] - a[1]);

        if (sorted.length === 0) {
            return {
                timeWindow: '48 horas',
                topSong: {
                    name: 'No hay tendencias',
                    artist: 'Últimas 48 horas',
                    growthRate: 0,
                    albumImage: null,
                    artistImage: null
                }
            };
        }

        const [topSongId, growthRate] = sorted[0];
        // Obtener datos de la canción usando la función auxiliar
        const songData = await getSongData(topSongId);

        return {
            timeWindow: '48 horas',
            topSong: {
                name: songData?.Title || songData?.title || songData?.Name || 'Canción',
                artist: songData?.ArtistName || songData?.artistName || songData?.Artist || 'Artista',
                growthRate: Math.round(growthRate),
                albumImage: songData?.Image || songData?.image || null,
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

