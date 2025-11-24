import {
    getSongByApiId,
    getOrCreateSong,
    updateSongRating
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
import { showAlert, showLoginRequiredModal, formatNotificationTime } from '../Handlers/headerHandler.js';
import { createAudioPlayer } from './../Components/audioPlayer.js';

// --- 2. ESTADO GLOBAL ---
let currentRating = 0;
let currentSongData = null; // Almacenará los datos de la canción
let commentsData = {}; // Para simulación de comentarios
let editingCommentId = null;
let originalCommentText = null;
let deletingReviewId = null;
let deletingCommentId = null;

// --- 3. PUNTO DE ENTRADA (LLAMADO POR MAIN.JS) ---
// ¡CORREGIDO! Ya no usa DOMContentLoaded
export function initializeSongPage() {
    console.log("Inicializando lógica de Canción...");
    initializeTabNavigation();
    initializeCreateReviewModal();
    loadPageData();

    // Inicializar modals (copiados de albumAdmin)
    // (Asegúrate de que tu song.html tenga los modals correspondientes)
    initializeCommentsModalLogic();
    initializeDeleteModalsLogic();
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
    document.getElementById('detailGenre').textContent = song.genre || '-';

    try {
        const parts = song.duration.split(':');
        const min = parseInt(parts[1]);
        const sec = parseInt(parts[2]);
        document.getElementById('detailDuration').textContent = `${min} min ${sec} seg`;
    } catch (e) {
        document.getElementById('detailDuration').textContent = '-';
    }
}

function renderReviews(reviews) {
    const listEl = document.getElementById('reviewsList');
    if (!listEl) return;
    listEl.innerHTML = reviews.length > 0
        ? reviews.map(createReviewCard).join('')
        : '<p class="text-light text-center">Aún no hay reseñas.</p>';
        
    attachReviewActionListeners(listEl); 

    document.getElementById('aiSummary').style.display = reviews.length > 2 ? 'flex' : 'none';
    if(document.getElementById('aiSummaryText')) {
        document.getElementById('aiSummaryText').textContent = "Los fans destacan la energía de esta canción...";
    }
}

// --- LÓGICA DEL MODAL "CREAR RESEÑA" ---

function initializeCreateReviewModal() {
    const btnAgregar = document.getElementById('btnAgregarResena');
    const modalOverlay = document.getElementById('createReviewModalOverlay');
    const btnClose = document.getElementById('closeCreateReviewModal');
    const starsInput = document.getElementById('starsRatingInput');
    const btnSubmit = document.getElementById('submitReviewBtn');

    if(btnAgregar) btnAgregar.addEventListener('click', showCreateReviewModal);
    if(btnClose) btnClose.addEventListener('click', hideCreateReviewModal);
    if(modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) hideCreateReviewModal(); });
    if(starsInput) {
        starsInput.addEventListener('click', (e) => { if (e.target.tagName === 'I') setStarRating(parseInt(e.target.dataset.value)); });
        starsInput.addEventListener('mouseover', (e) => { if (e.target.tagName === 'I') highlightStars(parseInt(e.target.dataset.value)); });
        starsInput.addEventListener('mouseout', () => highlightStars(currentRating));
    }
    if(btnSubmit) btnSubmit.addEventListener('click', handleSubmitReview);
}

function showCreateReviewModal() {
    if (!currentSongData) {
        showAlert("Error: No se han cargado los datos de la canción.", "danger");
        return;
    }
    const modalOverlay = document.getElementById('createReviewModalOverlay');
    if (!modalOverlay) return;

    document.getElementById('modalSongCover').src = currentSongData.image || 'https://via.placeholder.com/100';
    document.getElementById('modalSongTitle').textContent = currentSongData.title;
    document.getElementById('modalSongArtist').textContent = currentSongData.artistName;
    document.getElementById('reviewTitleInput').value = '';
    document.getElementById('reviewTextInput').value = '';
    setStarRating(0);
clearReviewFormErrors();
    document.getElementById('createReviewModalOverlay').style.display = 'flex';
}

function hideCreateReviewModal() { 
    const modal = document.getElementById('createReviewModalOverlay');
    if(modal) modal.style.display = 'none'; 
}
function setStarRating(rating) { currentRating = rating; highlightStars(rating); }
function highlightStars(rating) {
    document.querySelectorAll('#starsRatingInput i').forEach(star => {
        const val = parseInt(star.dataset.value);
        star.className = val <= rating ? 'fas fa-star' : 'far fa-star';
    });
}

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
                likesSpan.textContent = Math.max(0, currentLikes - 1);
                const reactionId = localStorage.getItem(`reaction_${reviewId}_${currentUserId}`);
                try {
                    await deleteReviewReaction(reviewId, currentUserId, authToken, reactionId);
                    localStorage.removeItem(`reaction_${reviewId}_${currentUserId}`);
                    localStorage.removeItem(`like_${reviewId}_${currentUserId}`);
                } catch (err) { console.warn('No se pudo eliminar like del backend', err); }
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
        });
    });
    reviewsListElement.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const reviewId = this.getAttribute('data-review-id');
            const title = this.getAttribute('data-review-title') || '';
            const content = this.getAttribute('data-review-content') || '';
            const rating = parseInt(this.getAttribute('data-review-rating')) || 0;
            showEditReviewModal(reviewId, title, content, rating);
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
            showDeleteReviewModal(reviewId, reviewTitle);
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
            showCommentsModal(reviewId);
        });
    });
    reviewsListElement.querySelectorAll('.review-clickable').forEach(element => {
        element.addEventListener('click', function(e) {
            if (e.target.closest('.review-actions') || e.target.closest('.btn-edit') || e.target.closest('.btn-delete') || e.target.closest('.btn-like') || e.target.closest('.comment-btn')) {
                return;
            }
            const reviewId = this.getAttribute('data-review-id');
            if (reviewId) {
            }
        });
    });
}

function initializeCommentsModalLogic() {
    const closeCommentsModal = document.getElementById('closeCommentsModal');
    const submitCommentBtn = document.getElementById('submitCommentBtn');
    const commentInput = document.getElementById('commentInput');
    const commentsModalOverlay = document.getElementById('commentsModalOverlay');
    
    if (closeCommentsModal) closeCommentsModal.addEventListener('click', hideCommentsModal);
    if (submitCommentBtn) submitCommentBtn.addEventListener('click', submitComment);
    if (commentInput) {
        commentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitComment();
        });
    }
    if (commentsModalOverlay) {
        commentsModalOverlay.addEventListener('click', (e) => {
            if (e.target === commentsModalOverlay) hideCommentsModal();
        });
    }
}

async function showCommentsModal(reviewId) {
    const modal = document.getElementById('commentsModalOverlay');
    if (!modal) return;
    
    modal.setAttribute('data-review-id', reviewId);
    modal.style.display = 'flex';
    
    await loadCommentsIntoModal(reviewId);
}
    
async function loadCommentsIntoModal(reviewId) {
    const commentsList = document.getElementById('commentsList');
    const commentsCount = document.getElementById('commentsCount');
    if (!commentsList || !commentsCount) return;
    
    commentsList.innerHTML = '<div class="comment-empty">Cargando...</div>';
    
    try {
        const comments = await getCommentsByReview(reviewId);
        
        commentsCount.textContent = comments.length;
        
        const currentUserIdRaw = localStorage.getItem('userId');
        const currentUserId = currentUserIdRaw ? String(currentUserIdRaw).trim() : null;
        
        if (comments.length === 0) {
            commentsList.innerHTML = `<div class="comment-empty"><i class="fas fa-comment-slash"></i><p>No hay comentarios aún.</p></div>`;
        } else {
            commentsList.innerHTML = comments.map(comment => {
                const timeAgo = formatNotificationTime(comment.Created || comment.Created || comment.date);
                const username = comment.UserName || comment.username || 'Usuario';
                const text = comment.Text || comment.text || '';
                let commentId = comment.Id_Comment || comment.id_Comment || comment.IdComment || comment.idComment || comment.id || comment.Id || '';
            if (commentId) commentId = String(commentId).trim();
                const commentUserId = comment.IdUser || comment.idUser || comment.Id_User || comment.id_user || comment.userId || '';
                const likes = comment.Likes || comment.likes || 0;
                const userLiked = comment.userLiked || false;
                
                const normalizedCommentUserId = commentUserId ? String(commentUserId).trim() : '';
                const isOwnComment = currentUserId && normalizedCommentUserId && 
                    normalizedCommentUserId.toLowerCase() === currentUserId.toLowerCase();
                
                let actionButtons = '';
                if (isOwnComment) {
                    actionButtons = `
                        <div class="comment-actions">
                            <button class="comment-action-btn comment-edit-btn" data-comment-id="${commentId}" title="Editar"><i class="fas fa-pencil"></i></button>
                            <button class="comment-action-btn comment-delete-btn" data-comment-id="${commentId}" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    `;
                } else {
                    actionButtons = '';
                }
        
                return `
                <div class="comment-item" data-comment-id="${commentId}">
                    <div class="comment-avatar"><img src="../Assets/default-avatar.png" alt="${username}"></div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <span class="comment-username">${username}</span>
                    s       <span class="comment-time">${timeAgo}</span>
                        </div>
                        <p class="comment-text" id="comment-text-${commentId}">${text}</p>
                        <div class="comment-footer">
                            <button class="comment-like-btn ${userLiked ? 'liked' : ''}" data-comment-id="${commentId}" title="Me gusta">
                            <i class="fa-solid fa-heart" style="color: ${userLiked ? 'var(--magenta, #EC4899)' : 'rgba(255,255,255,0.6)'};"></i>
                                <span class="comment-likes-count">${likes}</span>
                            </button>
                            ${actionButtons}
                        </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        attachCommentActionListeners();
    } catch (error) {
        console.error("Error cargando comentarios en modal:", error);
        commentsList.innerHTML = `<div class="comment-empty">Error al cargar comentarios.</div>`;
    }
    
    const commentBtn = document.querySelector(`.comment-btn[data-review-id="${reviewId}"]`);
    if (commentBtn) {
        const countSpan = commentBtn.querySelector('.review-comments-count');
        if (countSpan) {
            const comments = await getCommentsByReview(reviewId);
            countSpan.textContent = comments.length;
        }
    }
}
    
function hideCommentsModal() {
    const modal = document.getElementById('commentsModalOverlay');
    if (modal) modal.style.display = 'none';
}
    
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
        const authToken = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        
        await createComment(reviewId, commentText, userId, authToken);
        
        commentInput.value = '';
        await loadCommentsIntoModal(reviewId);
        
        const reviewDetailModal = document.getElementById('reviewDetailModalOverlay');
        if (reviewDetailModal && reviewDetailModal.style.display === 'flex') {
            const detailComments = await getCommentsByReview(reviewId);
            await loadReviewDetailComments(reviewId, detailComments);
            const commentsCount = document.getElementById('reviewDetailCommentsCount');
            if (commentsCount) commentsCount.textContent = detailComments.length;
        }
        
        showAlert('Comentario agregado exitosamente', 'success');
    } catch (error) {
        console.error('Error agregando comentario:', error);
        showAlert('Error al agregar el comentario', 'danger');
    }
}
    
function attachCommentActionListeners() {
    document.querySelectorAll('.comment-edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const commentId = this.getAttribute('data-comment-id');
            editComment(commentId);
        });
    });
    
    document.querySelectorAll('.comment-delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const commentId = this.getAttribute('data-comment-id');
            deleteComment(commentId);
        });
    });
    
    document.querySelectorAll('.comment-like-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const commentId = this.getAttribute('data-comment-id');
            toggleCommentLike(commentId, this);
        });
    });
}
    
async function toggleCommentLike(commentId, btn) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) { return showLoginRequiredModal(); }
    Indentation
    const icon = btn.querySelector('i');
    const likesSpan = btn.querySelector('.comment-likes-count');
    const isLiked = btn.classList.contains('liked');
    const currentLikes = parseInt(likesSpan.textContent) || 0;
    
    if (isLiked) {
        btn.classList.remove('liked');
        icon.style.color = 'rgba(255,255,255,0.6)';
        likesSpan.textContent = Math.max(0, currentLikes - 1);
    } else {
        btn.classList.add('liked');
        icon.style.color = 'var(--magenta, #EC4899)';
        likesSpan.textContent = currentLikes + 1;
    }
    console.log('Like en comentario (simulado):', commentId);
}
    
function editComment(commentId) {
    showEditCommentModal(commentId);
}

function showEditCommentModal(commentId) {
    const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    const commentTextElement = document.getElementById(`comment-text-${commentId}`);
    if (!commentItem || !commentTextElement) return;
    if (commentItem.classList.contains('editing')) return;
    
    originalCommentText = commentTextElement.textContent.trim();
    editingCommentId = commentId;
    const currentText = originalCommentText;
    
    const textarea = document.createElement('textarea');
    textarea.className = 'comment-text-edit';
    textarea.id = `comment-text-edit-${commentId}`;
    textarea.value = currentText;
    textarea.maxLength = 500;
    textarea.rows = 3;
    textarea.setAttribute('data-comment-id', commentId);
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'comment-edit-buttons';
    buttonsContainer.setAttribute('data-comment-id', commentId);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'comment-edit-action-btn comment-edit-cancel';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.type = 'button';
    cancelBtn.setAttribute('data-comment-id', commentId);
    cancelBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        cancelEditComment(commentId);
    });
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'comment-edit-action-btn comment-edit-confirm';
    confirmBtn.textContent = 'Confirmar';
    confirmBtn.type = 'button';
    confirmBtn.setAttribute('data-comment-id', commentId);
    confirmBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        confirmEditComment(commentId);
    });
    
    buttonsContainer.appendChild(cancelBtn);
   buttonsContainer.appendChild(confirmBtn);
    
    commentTextElement.replaceWith(textarea);
    textarea.parentNode.insertBefore(buttonsContainer, textarea.nextSibling);
        
    commentItem.classList.add('editing');
    
    const commentFooter = commentItem.querySelector('.comment-footer');
    if (commentFooter) commentFooter.style.display = 'none';
    
    setTimeout(() => textarea.focus(), 10);
}
    
function cancelEditComment(commentId) {
    const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    if (!commentItem) return;
    
    const textarea = document.getElementById(`comment-text-edit-${commentId}`);
    const buttonsContainer = commentItem.querySelector('.comment-edit-buttons');
    const commentFooter = commentItem.querySelector('.comment-footer');
    
    if (textarea) {
        const commentTextElement = document.createElement('p');
        commentTextElement.className = 'comment-text';
        commentTextElement.id = `comment-text-${commentId}`;
        commentTextElement.textContent = originalCommentText;
        textarea.replaceWith(commentTextElement);
    }
    
    if (buttonsContainer) buttonsContainer.remove();
    if (commentFooter) commentFooter.style.display = 'flex';
   
    commentItem.classList.remove('editing');
    
    editingCommentId = null;
    originalCommentText = null;
}
    
async function confirmEditComment(commentId) {
    if (!commentId) commentId = editingCommentId;
    if (!commentId) {
        showAlert('Error: No se pudo identificar el comentario a editar', 'danger');
        return;
    }
    
    const modal = document.getElementById('commentsModalOverlay');
    const reviewId = modal ? modal.getAttribute('data-review-id') : null;
    const textarea = document.getElementById(`comment-text-edit-${commentId}`);
    
    if (!reviewId || !textarea) {
        showAlert('Error: No se pudo encontrar la reseña o el campo de edición', 'danger');
        return;
    }
    
    const newText = textarea.value.trim();
    if (!newText) {
        showAlert('El comentario no puede estar vacío', 'warning');
return;
   }
    
    try {
        await updateCommentInData(reviewId, commentId, newText);
        await loadCommentsIntoModal(reviewId);
        
        const reviewDetailModal = document.getElementById('reviewDetailModalOverlay');
        if (reviewDetailModal && reviewDetailModal.style.display === 'flex') {
            await loadReviewDetailComments(reviewId);
        }
        
        showAlert('Comentario editado exitosamente', 'success');
    } catch (error) {
        console.error('❌ Error al actualizar comentario:', error);
        showAlert('Error al actualizar el comentario. Por favor, intenta nuevamente.', 'danger');
    }
    
    editingCommentId = null;
    originalCommentText = null;
}
    
async function updateCommentInData(reviewId, commentId, newText) {
   const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        console.error('No hay token para actualizar comentario');
        throw new Error("No autenticado");
    }
    
    if (authToken.startsWith('dev-token-')) {
        if (commentsData[reviewId]) {
            const comment = commentsData[reviewId].find(c => (c.Id_Comment || c.id) === commentId);
            if (comment) {
                comment.Text = newText;
                comment.Updated = new Date().toISOString();
            }
            return;
   }
    }
    
    await updateComment(commentId, newText, authToken);
}


function initializeDeleteModalsLogic() {
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
        deleteCommentModalOverlay.addEventListener('click', (e) => {
            if (e.target === deleteCommentModalOverlay) hideDeleteCommentModal();
        });
    }
    
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
        deleteReviewModalOverlay.addEventListener('click', (e) => {
            if (e.target === deleteReviewModalOverlay) hideDeleteReviewModal();
        });
    }
}



function showDeleteCommentModal(commentId) {
    deletingCommentId = commentId;
    const modal = document.getElementById('deleteCommentModalOverlay');
    if(modal) modal.style.display = 'flex';
}
    
function hideDeleteCommentModal() {
    const modal = document.getElementById('deleteCommentModalOverlay');
    if(modal) modal.style.display = 'none';
    deletingCommentId = null;
}
    
async function confirmDeleteComment() {
    if (!deletingCommentId) return;
    
    const modal = document.getElementById('commentsModalOverlay');
    const reviewId = modal ? modal.getAttribute('data-review-id') : null;
    if (!reviewId) return;
    
    const authToken = localStorage.getItem('authToken');
    
    try {
        await deleteComment(deletingCommentId, authToken);
        
        hideDeleteCommentModal();
        await loadCommentsIntoModal(reviewId);
        
        const reviewDetailModal = document.getElementById('reviewDetailModalOverlay');
        if (reviewDetailModal && reviewDetailModal.style.display === 'flex') {
            const comments = await getCommentsByReview(reviewId);
            await loadReviewDetailComments(reviewId, comments);
           const commentsCount = document.getElementById('reviewDetailCommentsCount');
            if (commentsCount) commentsCount.textContent = comments.length;
        }
        
        showAlert('Comentario eliminado exitosamente', 'success');
    } catch (error) {
        console.error('Error eliminando comentario:', error);
        showAlert('Error al eliminar el comentario', 'danger');
        hideDeleteCommentModal();
    }
}
    

function showDeleteReviewModal(reviewId, reviewTitle) {
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
    
    deletingReviewId = reviewId;
    
    const modal = document.getElementById('deleteReviewModalOverlay');
    const messageElement = document.getElementById('deleteReviewMessage');
    
    if (modal && messageElement) {
        messageElement.textContent = `¿Estás seguro de que quieres eliminar la reseña "${reviewTitle}"? Esta acción no se puede deshacer.`;
        modal.style.display = 'flex';
    } else {
        console.error('❌ Modal de eliminación de reseña no encontrado');
    }
}
    
function hideDeleteReviewModal() {
    const modal = document.getElementById('deleteReviewModalOverlay');
    if (modal) modal.style.display = 'none';
   deletingReviewId = null;
}
    
async function confirmDeleteReview() {
    if (!deletingReviewId) {
        showAlert('Error: No se pudo identificar la reseña a eliminar', 'danger');
        return;
    }
    
    const reviewIdToDelete = deletingReviewId;
    hideDeleteReviewModal();
    
    await deleteReviewLogic(reviewIdToDelete);
}
    

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