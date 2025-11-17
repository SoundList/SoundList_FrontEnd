/**
 * Módulo de datos del carrusel
 * Funciones para obtener datos de rankings (más recomendado, más comentado, top 10, etc.)
 */

import { getReviews, getCommentsByReview, getReviewReactionCount } from '../../APIs/socialApi.js';
import { getSongByApiId } from '../../APIs/contentApi.js';

/**
 * LO MÁS RECOMENDADO
 * Lógica: Promedio de calificaciones (mínimo 10 reseñas)
 */
export async function getMasRecomendado() {
    try {
        // Obtener todas las reseñas
        const reviews = await getReviews();
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

        // Agrupar reseñas por SongId
        const songsMap = {};
        reviews.forEach(review => {
            const songId = review.SongId || review.songId;
            if (!songId) return;

            if (!songsMap[songId]) {
                songsMap[songId] = {
                    songId: songId,
                    ratings: [],
                    reviewIds: []
                };
            }
            const rating = review.Rating || review.rating || 0;
            songsMap[songId].ratings.push(rating);
            songsMap[songId].reviewIds.push(review.ReviewId || review.reviewId || review.id);
        });

        // Calcular promedio de rating para cada canción (mínimo 10 reseñas)
        const minReviews = 10;
        const songsWithAvg = Object.values(songsMap)
            .filter(song => song.ratings.length >= minReviews)
            .map(song => ({
                ...song,
                avgRating: song.ratings.reduce((a, b) => a + b, 0) / song.ratings.length,
                totalReviews: song.ratings.length
            }))
            .sort((a, b) => b.avgRating - a.avgRating);

        if (songsWithAvg.length === 0) {
            return {
                totalSongs: Object.keys(songsMap).length,
                minReviews: minReviews,
                topSong: {
                    name: 'No hay suficientes reseñas',
                    artist: `Mínimo ${minReviews} reseñas por canción`,
                    avgRating: 0,
                    totalReviews: 0,
                    albumImage: null,
                    artistImage: null
                }
            };
        }

        const topSong = songsWithAvg[0];
        // Obtener datos de la canción
        let songData = null;
        try {
            songData = await getSongByApiId(topSong.songId);
        } catch (e) {
            console.debug('No se pudo obtener datos de la canción:', topSong.songId);
        }

        return {
            totalSongs: songsWithAvg.length,
            minReviews: minReviews,
            topSong: {
                name: songData?.Title || songData?.title || songData?.Name || 'Canción',
                artist: songData?.ArtistName || songData?.artistName || songData?.Artist || 'Artista',
                avgRating: topSong.avgRating,
                totalReviews: topSong.totalReviews,
                albumImage: songData?.Image || songData?.image || null,
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
        // Obtener datos de la canción
        let songData = null;
        try {
            songData = await getSongByApiId(topSong.songId);
        } catch (e) {
            console.debug('No se pudo obtener datos de la canción:', topSong.songId);
        }

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
        let songData = null;
        try {
            songData = await getSongByApiId(topSongId);
        } catch (e) {
            console.debug('No se pudo obtener datos de la canción:', topSongId);
        }

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

