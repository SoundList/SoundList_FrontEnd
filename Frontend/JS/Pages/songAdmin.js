import {
    getSongByApiId,
    getOrCreateSong,
    updateSongRating,
    generateSongSummary
} from './../APIs/contentApi.js'; 

import { 
    createStarRating, 
    createReviewCard,
    createSongListItem 
} from './../Components/renderContent.js'; 

import { initializeTabNavigation } from './../Handlers/albumHandler.js';
import {
    getReviews,     
    createReview,   
    deleteReview,
    updateReview,
    getCommentsByReview,
    createComment,
    updateComment,
    deleteComment,
    getReviewReactionCount,
    addReviewReaction,
    deleteReviewReaction,
    getAverageRating,
    getUser
} from './../APIs/socialApi.js';
import { showLoginRequiredModal, formatNotificationTime } from '../Handlers/headerHandler.js';
import { showAlert } from '../Utils/reviewHelpers.js';
import { createAudioPlayer } from './../Components/audioPlayer.js';
import { initializeCreateReviewModal, showCreateReviewModal, showEditReviewModal } from '../Components/modals/createReviewModal.js';
import { initializeCommentsModalLogic, showCommentsModal } from '../Components/modals/commentsModal.js';
import { initializeReviewDetailModalLogic, showReviewDetailModal } from '../Components/modals/reviewDetailModal.js';
import { initializeDeleteModalsLogic, showDeleteReviewModal } from '../Components/modals/deleteModals.js';

// --- 2. ESTADO GLOBAL ---
let currentRating = 0;
let currentSongData = null; // Almacenará los datos de la canción
let commentsData = {}; // Para simulación de comentarios

// Función para recargar reseñas después de crear/editar (debe estar antes de modalsState)
async function reloadSongReviews() {
    if (!currentSongData || !currentSongData.songId) return;
    
    try {
        const allReviews = await getReviews();
        const reviewsData = allReviews.filter(r => r.songId === currentSongData.songId || r.SongId === currentSongData.songId);
        updateHeaderStatistics(reviewsData);
        const enrichedReviews = await Promise.all(
            reviewsData.map(async (review) => {
                try {
                    const reviewId = review.reviewId || review.ReviewId || review.id;
                    const userId = review.userId || review.UserId;
                    const [userData, likes, comments] = await Promise.all([
                        getUser(userId).catch(e => null),
                        getReviewReactionCount(reviewId).catch(e => 0),
                        getCommentsByReview(reviewId).catch(e => [])
                    ]);
                    const currentUserId = localStorage.getItem('userId');
                    const userLiked = localStorage.getItem(`like_${reviewId}_${currentUserId}`) === 'true';
                    return {
                        id: reviewId,
                        username: userData?.username || userData?.Username || 'Usuario',
                        avatar: userData?.imgProfile || userData?.ImgProfile || '../Assets/default-avatar.png',
                        contentType: 'Canción',
                        song: currentSongData.title,
                        artist: currentSongData.artistName,
                        title: review.title || review.Title,
                        comment: review.content || review.Content,
                        rating: review.rating || review.Rating,
                        likes: likes,
                        comments: comments.length,
                        userLiked: userLiked,
                        userId: userId,
                        isUserDeleted: !userData
                    };
                } catch (error) {
                    console.error("Error enriqueciendo reseña:", error, review);
                    return null;
                }
            })
        );
        renderReviews(enrichedReviews.filter(r => r !== null));
    } catch (error) {
        console.error("Error recargando reseñas:", error);
    }
}

// Estado compartido para los modals (igual que en homeAdmin.js)
const modalsState = {
    currentReviewData: null,
    editingCommentId: null,
    originalCommentText: null,
    deletingReviewId: null,
    deletingCommentId: null,
    commentsData: commentsData,
    loadReviews: reloadSongReviews // Función para recargar reseñas después de crear/editar
};

// --- 3. PUNTO DE ENTRADA (LLAMADO POR MAIN.JS) ---
// ¡CORREGIDO! Ya no usa DOMContentLoaded
export function initializeSongPage() {
    console.log("Inicializando lógica de Canción...");
    initializeTabNavigation();
    loadPageData();

    // Inicializar modals con el estado compartido (igual que en homeAdmin.js)
    initializeCreateReviewModal(modalsState);
    initializeCommentsModalLogic(modalsState);
    initializeReviewDetailModalLogic(modalsState);
    initializeDeleteModalsLogic(modalsState);
    
    // Configurar botón de crear reseña específico de song (si existe)
    const btnAgregarResena = document.getElementById('btnAgregarResena');
    if (btnAgregarResena) {
        btnAgregarResena.addEventListener('click', () => {
            if (currentSongData) {
                const contentData = {
                    type: 'song',
                    id: currentSongData.apiSongId || currentSongData.id,
                    name: currentSongData.title || '',
                    artist: currentSongData.artistName || '',
                    image: currentSongData.image || ''
                };
                showCreateReviewModal(contentData, modalsState);
            } else {
                showCreateReviewModal(null, modalsState);
            }
        });
    }
    
    // Exponer funciones globalmente para que attachReviewActionListeners pueda usarlas (igual que en homeAdmin.js)
    if (typeof window !== 'undefined') {
        window.showCreateReviewModal = (contentData = null) => showCreateReviewModal(contentData, modalsState);
        window.showEditReviewModal = (reviewId, title, content, rating) => showEditReviewModal(reviewId, title, content, rating, modalsState);
        window.showCommentsModal = (reviewId) => showCommentsModal(reviewId, modalsState);
        window.showReviewDetailModal = (reviewId) => showReviewDetailModal(reviewId, modalsState);
        window.showDeleteReviewModal = (reviewId, reviewTitle) => showDeleteReviewModal(reviewId, reviewTitle, modalsState);
    }
}

// --- 4. FUNCIONES PRINCIPALES ---

// --- 4. FUNCIONES PRINCIPALES ---

async function loadPageData() {
    const loadingEl = document.getElementById('loadingSpinner');
    const contentEl = document.getElementById('songContent');

    try {
        const params = new URLSearchParams(window.location.search);
        const apiSongId = params.get('id'); // ID de Spotify (ej: 7d6yK...)
        
        // Validación más estricta del ID
        if (!apiSongId || apiSongId.trim() === '' || 
            apiSongId === 'undefined' || apiSongId === 'null' ||
            apiSongId.toLowerCase() === 'album' || apiSongId.toLowerCase() === 'artist' || apiSongId.toLowerCase() === 'song') {
            throw new Error("ID de canción inválido en la URL. Por favor, busca la canción nuevamente.");
        }
        
        console.log(`Cargando canción con ID: ${apiSongId}`);

        contentEl.style.display = 'none';
        loadingEl.style.display = 'block';

        // 1. Obtener datos principales (USANDO getOrCreateSong en lugar de getSongByApiId)
        // Esto soluciona el error "Cannot read properties of null"
        let songData = await getOrCreateSong(apiSongId);

        if (!songData) {
             throw new Error("No se pudo obtener la información de la canción (API retornó null).");
        }

        currentSongData = songData; // Guardamos globalmente
        const localSongId = songData.songId; // GUID local

        // 2. Renderizar header y detalles
        renderSongHeader(songData);
        renderSongDetails(songData);

        // 3. Obtener reseñas
        const allReviews = await getReviews();
        
        // Normalizamos el ID local para comparar
        const targetId = String(localSongId).trim().toLowerCase();

        const filteredReviews = allReviews.filter(review => {
            // Obtenemos el ID de la reseña de forma segura
            // Intentamos obtener el ID del contenido asociado
            const reviewSongId = review.songId || review.SongId;
            
            // Si la reseña no tiene SongId, la descartamos
            if (!reviewSongId) return false;

            // Normalizamos y comparamos con el GUID Local
            return String(reviewSongId).trim().toLowerCase() === targetId;
        });

        console.log(`Reseñas filtradas: ${filteredReviews.length} de ${allReviews.length}`);
        
        // 4. Enriquecer reseñas
        const reviewsData = await Promise.all(
            filteredReviews.map(async (review) => {
                try {
                    const reviewId = review.reviewId || review.ReviewId || review.id;
                    const userId = review.userId || review.UserId;
                    
                    const [userData, likes, comments] = await Promise.all([
                        getUser(userId).catch(e => null),
                        getReviewReactionCount(reviewId).catch(e => 0),
                        getCommentsByReview(reviewId).catch(e => [])
                    ]);
                    
                    const currentUserId = localStorage.getItem('userId');
                    const userLiked = localStorage.getItem(`like_${reviewId}_${currentUserId}`) === 'true'; 

                    return {
                        id: reviewId,
                        username: userData?.username || userData?.Username || 'Usuario',
                        avatar: userData?.imgProfile || userData?.ImgProfile || '../Assets/default-avatar.png',
                        contentType: 'Canción',
                        song: songData.title,
                        artist: songData.artistName,
                        title: review.title || review.Title,
                        comment: review.content || review.Content,
                        rating: review.rating || review.Rating,
                        likes: likes,
                        comments: comments.length,
                        userLiked: userLiked,
                        userId: userId
                    };
                } catch (error) {
                    console.error("Error enriqueciendo reseña:", error, review);
                    return null;
                }
            })
        );
        const validReviews = reviewsData.filter(r => r !== null);


        updateHeaderStatistics(filteredReviews);

        // 5. Renderizar reseñas
        renderReviews(validReviews);

        contentEl.style.display = 'block';
    } catch (error) {
        console.error("Error fatal al cargar página de canción:", error);
        // Si falla, mostramos mensaje amigable
        loadingEl.style.display = 'none';
        contentEl.innerHTML = `<div class="container text-center py-5">
            <h2 class="text-white mb-3">Oops! Algo salió mal.</h2>
            <p class="text-white-50">${error.message}</p>
            <a href="index.html" class="btn btn-primary mt-3">Volver al Inicio</a>
        </div>`;
        contentEl.style.display = 'block';
    } finally {
        loadingEl.style.display = 'none';
    }
}

// --- FUNCIONES DE RENDERIZADO ---

function renderSongHeader(song) {
    // 1. Renderizado existente
    document.getElementById('songCover').src = song.image || 'https://via.placeholder.com/300';
    document.getElementById('songTitle').textContent = song.title;
    
    const artistLink = document.getElementById('songArtistLink');
    artistLink.textContent = song.artistName;
    artistLink.href = `./artist.html?id=${song.apiArtistId}`; 
    
    const albumLink = document.getElementById('songAlbumLink');
    albumLink.textContent = `ÁLBUM: ${song.albumName || 'Álbum Desconocido'}`; 
    albumLink.href = `./album.html?id=${song.apiAlbumId}`;

    const rating = song.averageRating || 0;
    const reviewCount = song.reviewCount || 0;
    document.getElementById('ratingNumber').textContent = rating.toFixed(1);
    document.getElementById('ratingStars').innerHTML = createStarRating(rating, true);
    document.getElementById('ratingCount').textContent = `(${reviewCount} reviews)`;

    // ------------------------------------------------------
    // 2. LÓGICA DE AUDIO
    // ------------------------------------------------------
    const audioContainer = document.getElementById('audioPlayerContainer');
    if (audioContainer) {
        // Usamos nuestro componente personalizado
        // Pasamos la URL y el ID de la canción para generar IDs únicos en el DOM
        audioContainer.innerHTML = createAudioPlayer(song.previewUrl, song.songId);
    }
}


function renderSongDetails(song) {
    const releaseDate = new Date(song.releaseDate).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    
    document.getElementById('detailName').textContent = song.title;
    document.getElementById('detailReleaseDate').textContent = releaseDate;

    try {
        const parts = song.duration.split(':');
        const min = parseInt(parts[1]);
        const sec = parseInt(parts[2]);
        document.getElementById('detailDuration').textContent = `${min} min ${sec} seg`;
    } catch (e) {
        document.getElementById('detailDuration').textContent = '-';
    }
}

//load summaryIA
// Función para manejar la carga del resumen
async function loadAiSummaryLogic(songId, reviews) {
    const summaryBox = document.getElementById('aiSummary');
    const summaryText = document.getElementById('aiSummaryText');
    
    // Regla de negocio: Solo resumir si hay más de 2 reseñas (para que valga la pena)
    if (!reviews || reviews.length <= 2) {
        summaryBox.style.display = 'none';
        return;
    }

    // 1. Mostrar estado de carga
    summaryBox.style.display = 'flex';
    summaryText.innerHTML = '<em><i class="fas fa-spinner fa-spin"></i> Analizando opiniones con IA...</em>';

    try {
        // 2. Llamar al backend (Gateway -> Content -> Social + AI -> Vertex)
        const data = await generateSongSummary(songId);
        
        // 3. Mostrar el resultado
        if (data && data.resumen) {
            // Efecto de escritura tipo máquina (opcional, o solo texto directo)
            summaryText.textContent = data.resumen;
        } else {
            summaryBox.style.display = 'none';
        }
    } catch (error) {
        console.warn("No se pudo generar el resumen:", error);
        // Si falla, ocultamos la caja o mostramos un mensaje de error suave
        summaryText.textContent = "No se pudo generar el resumen en este momento.";
        // Ocultar después de unos segundos si falló
        setTimeout(() => { summaryBox.style.display = 'none'; }, 5000);
    }
}
//Render Review
function renderReviews(reviews) {
    const listEl = document.getElementById('reviewsList');
    if (!listEl) return;
    listEl.innerHTML = reviews.length > 0
        ? reviews.map(createReviewCard).join('')
        : '<p class="text-light text-center">Aún no hay reseñas.</p>';
        
    attachReviewActionListeners(listEl); 

    if (currentSongData && currentSongData.songId) {
        loadAiSummaryLogic(currentSongData.songId, reviews);
    }
}


// NOTA: initializeCreateReviewModal, showCreateReviewModal, showEditReviewModal ahora se importan de Components/modals/createReviewModal.js
// Las funciones locales fueron eliminadas para evitar conflictos

function displayFieldError(elementId, message) {
    const inputElement = document.getElementById(elementId);
    if (!inputElement) return;
    const isStarsContainer = elementId === 'starsRatingInput';
    const borderElement = isStarsContainer ? inputElement.parentElement : inputElement;
    const errorElementId = (elementId === 'starsRatingInput') ? 'reviewRatingError' : elementId.replace('Input', 'Error');
    const errorElement = document.getElementById(errorElementId);
    
    if (message) {
        borderElement.classList.add('is-invalid-custom'); 
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show-error'); 
        }
    } else {
        borderElement.classList.remove('is-invalid-custom');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show-error');
        }
    }
}


function clearReviewFormErrors() {
    displayFieldError('reviewTitleInput', null);
    displayFieldError('reviewTextInput', null);
    displayFieldError('starsRatingInput', null);
}



async function handleSubmitReview() {
    const authToken = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    
    if (!authToken || !userId) {
        showAlert('Debes iniciar sesión para crear una reseña', 'warning');
        
        return;
    }

    const reviewTitle = document.getElementById('reviewTitleInput').value.trim();
    const reviewText = document.getElementById('reviewTextInput').value.trim(); 
    let hasError = false;

    if (!reviewTitle) {
        
        displayFieldError('reviewTitleInput', 'El título de la reseña es obligatorio.');
        hasError = true;
    } else {
        
        displayFieldError('reviewTitleInput', null); 
    }

    
    if (!reviewText) {
        displayFieldError('reviewTextInput', 'El contenido de la reseña es obligatorio.');
        hasError = true;
    } else {
        
        displayFieldError('reviewTextInput', null);
    }

    
    if (currentRating === 0) { 
        
        displayFieldError('starsRatingInput', 'Debes seleccionar una calificación (1-5 estrellas).');
        hasError = true;
    } else {
        
        displayFieldError('starsRatingInput', null); 
    }

    if (hasError) {
        
        return; 
    }

    if (!currentSongData || !currentSongData.songId) {
        showAlert('Error: No se pudo identificar la canción.', 'danger');
        return;
    }

    const reviewData = {
        Title: reviewTitle,
        Content: reviewText, 
        Rating: currentRating,
        UserId: userId,
        SongId: currentSongData.songId, 
        AlbumId: null
    };
    
    const submitBtn = document.getElementById('submitReviewBtn');
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'SUBIENDO...';

        
        const response = await createReview(reviewData, authToken);
        const reviewId = response?.ReviewId || response?.reviewId || response?.Id_Review || response?.id;
        if (reviewId) {
            const storageKey = `review_content_${String(reviewId).trim()}`;
            try {
                console.log('🔍 currentSongData completo:', currentSongData);
                
                const artistName = currentSongData.ArtistName || 
                                currentSongData.artistName || 
                                (currentSongData.artist ? (currentSongData.artist.name || currentSongData.artist.Name) : null) ||
                                (currentSongData.Artist ? (currentSongData.Artist.Name || currentSongData.Artist.name) : null) ||
                                'Artista';
                
                const contentData = {
                    type: 'song',
                    id: currentSongData.apiSongId || currentSongData.APISongId || currentSongData.id,
                    name: currentSongData.title || currentSongData.Title || 'Canción',
                    artist: artistName,
                    image: currentSongData.image || currentSongData.Image || null
                };
                
                localStorage.setItem(storageKey, JSON.stringify(contentData));
                console.log(`💾 Datos del contenido guardados en localStorage: ${storageKey}`, contentData);
            } catch (e) {
                console.warn('Error guardando datos en localStorage:', e);
            }
        }

        try {

            const newAverage = await getAverageRating(currentSongData.songId, 'song');
            
            if (newAverage > 0) {
                await updateSongRating(currentSongData.apiSongId, newAverage);
                console.log(`✅ Calificación actualizada a ${newAverage} en Content Service.`);
            }
        } catch (syncError) {
            console.error("⚠️ Advertencia: La reseña se creó, pero falló el cálculo de promedio.", syncError);
        }
        
        showAlert('¡Reseña de canción enviada!', 'success');
        hideCreateReviewModal();

        const allReviews = await getReviews();
        const reviewsData = allReviews.filter(r => r.songId === currentSongData.songId || r.SongId === currentSongData.songId);
        updateHeaderStatistics(reviewsData);
        const enrichedReviews = await Promise.all(
            reviewsData.map(async (review) => {
                try {
                    const reviewId = review.reviewId || review.ReviewId || review.id;
                    const userId = review.userId || review.UserId;
                    const [userData, likes, comments] = await Promise.all([
                        getUser(userId).catch(e => null),
                        getReviewReactionCount(reviewId).catch(e => 0),
                        getCommentsByReview(reviewId).catch(e => [])
                    ]);
                    const currentUserId = localStorage.getItem('userId');
                    const userLiked = localStorage.getItem(`like_${reviewId}_${currentUserId}`) === 'true';
                    return {
                        id: reviewId,
                        username: userData?.username || userData?.Username || 'Usuario',
                        avatar: userData?.imgProfile || userData?.ImgProfile || '../Assets/default-avatar.png',
                        contentType: 'Canción',
                        song: currentSongData.title,
                        artist: currentSongData.artistName,
                        title: review.title || review.Title,
                        comment: review.content || review.Content,
                        rating: review.rating || review.Rating,
                        likes: likes,
                        comments: comments.length,
                        userLiked: userLiked,
                        userId: userId
                    };
                } catch (error) {
                    console.error("Error enriqueciendo reseña:", error, review);
                    return null;
                }
            })
        );
        renderReviews(enrichedReviews.filter(r => r !== null));

    } catch (error) {
        console.error("Error al enviar:", error);
        showAlert(`Error al enviar reseña: ${error.message}`, 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'SUBIR';
    }
}


function attachReviewActionListeners(reviewsListElement) {
    if (!reviewsListElement) return;
    reviewsListElement.querySelectorAll('.btn-like').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault(); e.stopPropagation();
            const authToken = localStorage.getItem('authToken');
            if (!authToken) { return showLoginRequiredModal(); }
            const icon = this.querySelector('i');
            const likesSpan = this.parentElement.querySelector('.review-likes-count');
            const isLiked = this.classList.contains('liked');
            const reviewId = this.getAttribute('data-review-id');
            const currentUserId = localStorage.getItem('userId');
            this.style.transform = 'scale(1.2)';
            setTimeout(() => { this.style.transform = ''; }, 200);
            if (isLiked) {
                this.classList.remove('liked');
                icon.style.color = 'rgba(255,255,255,0.7)';
                const currentLikes = parseInt(likesSpan.textContent);
                const newLikesCount = Math.max(0, currentLikes - 1);
                likesSpan.textContent = newLikesCount;
                const reactionId = localStorage.getItem(`reaction_${reviewId}_${currentUserId}`);
                try {
                    await deleteReviewReaction(reviewId, currentUserId, authToken, reactionId);
                    localStorage.removeItem(`reaction_${reviewId}_${currentUserId}`);
                    localStorage.removeItem(`like_${reviewId}_${currentUserId}`);
                } catch (err) { console.warn('No se pudo eliminar like del backend', err); }
                
                // --- LÓGICA RECUPERADA: Control dinámico del botón editar ---
                const reviewCard = this.closest('.review-item');
                const editBtn = reviewCard.querySelector('.btn-edit');
                
                if (editBtn) {
                    if (newLikesCount > 0) {
                        editBtn.style.setProperty('display', 'none', 'important');
                    } else {
                        editBtn.style.removeProperty('display');
                    }
                }
                // ------------------------------------------------------------
            } else {
                this.classList.add('liked');
                icon.style.color = 'var(--magenta, #EC4899)';
                const currentLikes = parseInt(likesSpan.textContent) || 0;
                likesSpan.textContent = currentLikes + 1;
                localStorage.setItem(`like_${reviewId}_${currentUserId}`, 'true');
                try {
                    const data = await addReviewReaction(reviewId, currentUserId, authToken);
                    const reactionId = data?.Id_Reaction || data?.ReactionId || data?.id;
                    if (reactionId) {
                        localStorage.setItem(`reaction_${reviewId}_${currentUserId}`, reactionId);
                    }
                } catch (err) { console.warn('No se pudo guardar like en el backend', err); }
            }
            
            // --- LÓGICA RECUPERADA: Control dinámico del botón editar ---
            const reviewCard = this.closest('.review-item');
            const editBtn = reviewCard.querySelector('.btn-edit');
            const newLikesCount = parseInt(likesSpan.textContent) || 0;
            
            if (editBtn) {
                if (newLikesCount > 0) {
                    editBtn.style.setProperty('display', 'none', 'important');
                } else {
                    editBtn.style.removeProperty('display');
                }
            }
            // ------------------------------------------------------------
        });
    });
    reviewsListElement.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            // Check de seguridad: No abrir si está oculto (aunque no debería clickearse)
            if (this.style.display === 'none') return;
            
            const reviewId = this.getAttribute('data-review-id');
            const title = this.getAttribute('data-review-title') || '';
            const content = this.getAttribute('data-review-content') || '';
            const rating = parseInt(this.getAttribute('data-review-rating')) || 0;
            
            if (typeof window.showEditReviewModal === 'function') {
                window.showEditReviewModal(reviewId, title, content, rating);
            } else if (typeof showEditReviewModal === 'function') {
                showEditReviewModal(reviewId, title, content, rating, modalsState);
            }
        });
    });
    reviewsListElement.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); 
            let reviewId = this.getAttribute('data-review-id');
            if (!reviewId) {
                const reviewItem = this.closest('.review-item');
                reviewId = reviewItem ? reviewItem.getAttribute('data-review-id') : null;
            }
            if (!reviewId) {
                showAlert('Error: No se pudo identificar la reseña a eliminar', 'danger');
                return;
            }
            const reviewTitle = this.closest('.review-item')?.querySelector('.review-title')?.textContent || 'esta reseña';
            
            if (typeof window.showDeleteReviewModal === 'function') {
                window.showDeleteReviewModal(reviewId, reviewTitle);
            } else if (typeof showDeleteReviewModal === 'function') {
                showDeleteReviewModal(reviewId, reviewTitle, modalsState);
            }
        });
    });
    reviewsListElement.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); 
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                showLoginRequiredModal();
                return;
            }
            const reviewId = this.getAttribute('data-review-id');
            
            if (typeof window.showCommentsModal === 'function') {
                window.showCommentsModal(reviewId);
            } else if (typeof showCommentsModal === 'function') {
                showCommentsModal(reviewId, modalsState);
            }
        });
    });
    reviewsListElement.querySelectorAll('.review-clickable').forEach(element => {
        element.addEventListener('click', function(e) {
            // Si se hace clic en avatar/username, no abrir el modal de reseña
            if (e.target.classList.contains('profile-navigation-trigger') || e.target.closest('.profile-navigation-trigger')) {
                return;
            }
            if (e.target.closest('.review-actions') || e.target.closest('.btn-edit') || e.target.closest('.btn-delete') || e.target.closest('.btn-like') || e.target.closest('.comment-btn') || e.target.closest('.icon-follow-btn')) {
                return;
            }
            
            const reviewId = this.getAttribute('data-review-id');
            if (reviewId) {
                if (typeof window.showReviewDetailModal === 'function') {
                    window.showReviewDetailModal(reviewId);
                }
            }
        });
    });
    
    // Navegación a perfil desde avatar/username
    reviewsListElement.querySelectorAll('.profile-navigation-trigger').forEach(element => {
        element.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.getAttribute('data-user-id');
            if (userId && typeof window.navigateToProfile === 'function') {
                window.navigateToProfile(userId);
            }
        });
    });
}

// NOTA: initializeCommentsModalLogic, showCommentsModal, initializeDeleteModalsLogic, showDeleteReviewModal
// ahora se importan de Components/modals/commentsModal.js y deleteModals.js
// Las funciones locales fueron eliminadas para evitar conflictos
    

async function deleteReviewLogic(reviewId) {
    const userId = localStorage.getItem('userId');
    const authToken = localStorage.getItem('authToken');
    
    if (!userId || !authToken) {
        showAlert('Debes iniciar sesión para eliminar reseñas', 'warning');
        return;
    }
    
    console.log('🗑️ Eliminando reseña:', { reviewId, userId });
    
    try {
        await deleteReview(reviewId, userId, authToken);
        
        showAlert('Reseña eliminada exitosamente', 'success');
        
        if (typeof loadReviews === 'function') {
            await loadPageData(); // Recargamos toda la data para que se actualice el contador
Indentation    }
    } catch (error) {
        console.error('Error eliminando reseña:', error);
        if (error.response) {
            const status = error.response.status;
            
            if (status === 409) {
                showAlert('No se puede eliminar la reseña porque tiene likes o comentarios.', 'warning');
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
    
function initializeSampleComments() {
        const authToken = localStorage.getItem('authToken');
        if (authToken && authToken.startsWith('dev-token-')) {
            setTimeout(() => {
                const reviewItems = document.querySelectorAll('.review-item');
                if (reviewItems.length > 0) {
                    const firstReviewId = reviewItems[0].getAttribute('data-review-id');
               if (firstReviewId && !commentsData[firstReviewId]) {
                       const currentUserId = localStorage.getItem('userId');
                        commentsData[firstReviewId] = [
                            {
                                Id_Comment: 'dev-comment-1',
                                Text: '¡Excelente canción! Me encanta.',
                                Created: new Date(Date.now() - 3600000).toISOString(), 
                                ReviewId: firstReviewId,
                                IdUser: currentUserId || 'sample-user-1', 
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
                        
                        const commentBtn = document.querySelector(`.comment-btn[data-review-id="${firstReviewId}"]`);
                     if (commentBtn) {
                            const countSpan = commentBtn.querySelector('.review-comments-count');
                  if (countSpan) {
                                countSpan.textContent = commentsData[firstReviewId].length;
                        }
                        }
                    }
                }
         }, 2000);
        }
    }


function updateHeaderStatistics(reviews) {
    const ratingNumberEl = document.getElementById('ratingNumber');
    const ratingStarsEl = document.getElementById('ratingStars');
    const ratingCountEl = document.getElementById('ratingCount');

    if (!reviews || reviews.length === 0) {
        ratingNumberEl.textContent = "0.0";
        ratingStarsEl.innerHTML = createStarRating(0, true); 
        ratingCountEl.textContent = "(0 reviews)";
        return;
    }

    // 1. Sumar todas las calificaciones
    const totalRating = reviews.reduce((sum, review) => {
        const rating = review.rating || review.Rating || 0;
        return sum + Number(rating);
    }, 0);

    // 2. Calcular promedio crudo 
    const rawAverage = totalRating / reviews.length;

    // 3. Redondear al 0.5 más cercano
    const roundedAverage = Math.round(rawAverage * 2) / 2;

    // 4. Actualizar el DOM
    ratingNumberEl.textContent = roundedAverage.toFixed(1); 
    ratingStarsEl.innerHTML = createStarRating(roundedAverage, true); 
    ratingCountEl.textContent = `(${reviews.length} reviews)`;
}