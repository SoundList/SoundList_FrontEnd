import {
    getAlbumByApiId,
    getAlbumSongsByApiId,
    getOrCreateAlbum,
    updateAlbumRating,
    generateSongSummary 
} from './../APIs/contentApi.js';

import { 
    createSongListItem, 
    createStarRating, 
    createReviewCard 
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
    getUser,
    getAverageRating 
} from './../APIs/socialApi.js';

import { showLoginRequiredModal, formatNotificationTime } from '../Handlers/headerHandler.js';
import { showAlert } from '../Utils/reviewHelpers.js'; 

let currentRating = 0;
let currentAlbumData = null;  
let commentsData = {}; 
let editingCommentId = null;
let originalCommentText = null;
let deletingReviewId = null;
let deletingCommentId = null;

//  ---  INICIO  DE  LA  APLICACIÓN  ---
export function initializeAlbumPage() {
    console.log("Inicializando lógica de Album...");
    initializeTabNavigation();
    initializeCreateReviewModal();
    loadPageData(); 
    initializeCommentsModalLogic();
    initializeDeleteModalsLogic();
};

async function loadPageData() {
    const loadingEl = document.getElementById('loadingSpinner');
    const contentEl = document.getElementById('albumContent');
    
    try {
        const params = new URLSearchParams(window.location.search);
        const apiAlbumId = params.get('id'); 
        
        if (!apiAlbumId || apiAlbumId.trim() === '' || apiAlbumId === 'undefined' || apiAlbumId === 'null') {
            throw new Error("ID de álbum inválido.");
        }
        
        console.log(`Cargando álbum con ID: ${apiAlbumId}`);

        contentEl.style.display = 'none';
        loadingEl.style.display = 'block';

        const albumData = await getAlbumByApiId(apiAlbumId);
        currentAlbumData = albumData; 
        const localAlbumId = albumData.albumId; 

        renderAlbumHeader(albumData);
        
        const [songsData, allReviews] = await Promise.all([
            getAlbumSongsByApiId(apiAlbumId),
            getReviews()
        ]);

        const filteredReviews = allReviews.filter(review => {
            return (review.albumId === localAlbumId || review.AlbumId === localAlbumId);
        });

        const reviewsData = await Promise.all(
            filteredReviews.map(async (review) => {
                try {
                    const reviewId = review.reviewId || review.ReviewId || review.id;
                    const userId = review.userId || review.UserId;
                    
                    let isUserDeleted = false;
                    const [userData, likes, comments] = await Promise.all([
                        getUser(userId).catch(e => {
                            // Detectar si el usuario fue eliminado (404)
                            if (e.response && e.response.status === 404) {
                                isUserDeleted = true;
                            }
                            return null;
                        }),
                        getReviewReactionCount(reviewId).catch(e => 0),
                        getCommentsByReview(reviewId).catch(e => [])
                    ]);
                    
                    const currentUserId = localStorage.getItem('userId');
                    const userLiked = localStorage.getItem(`like_${reviewId}_${currentUserId}`) === 'true';

                    return {
                        id: reviewId,
                        username: userData?.username || userData?.Username || 'Usuario', // Mantener "Usuario" genérico, el badge indicará si está eliminado
                        avatar: userData?.imgProfile || userData?.ImgProfile || '../Assets/default-avatar.png',
                        contentType: 'Álbum',
                        song: albumData.title,
                        artist: albumData.artistName, 
                        title: review.title || review.Title,
                        comment: review.content || review.Content,
                        rating: review.rating || review.Rating,
                        likes: likes,
                        comments: comments.length,
                        userLiked: userLiked,
                        userId: userId,
                        isUserDeleted: isUserDeleted
                    };
                } catch (error) {
                    return null;
                }
            })
        );

        const validReviews = reviewsData.filter(r => r !== null);

        updateHeaderStatistics(filteredReviews);

        renderSongList(songsData);
        renderAlbumDetails(albumData, songsData ? songsData.length : 0);
        renderReviews(validReviews);

        contentEl.style.display = 'block';
        
    } catch (error) {
        console.error("Error fatal:", error);
        contentEl.innerHTML = `<h2 class="text-light text-center py-5">Error: ${error.message}</h2>`;
        contentEl.style.display = 'block';
    } finally {
        loadingEl.style.display = 'none';
    }
}

function renderAlbumHeader(album) {
    document.getElementById('albumCover').src = album.image || '../Assets/album-de-musica.png';
    document.getElementById('albumTitle').textContent = album.title;
    const artistLink = document.getElementById('albumArtistLink');
    artistLink.textContent = album.artistName || "Artista Desconocido";
    const artistId = album.apiArtistId || album.ApiArtistId;
    if (artistId) artistLink.href = `./artist.html?id=${artistId}`;
    
    const rating = album.averageRating || 0; 
    const reviewCount = album.reviewCount || 0;
    document.getElementById('ratingNumber').textContent = rating.toFixed(1);
    document.getElementById('ratingStars').innerHTML = createStarRating(rating, true);
    document.getElementById('ratingCount').textContent = `(${reviewCount} reviews)`;
}

function renderSongList(songs) {
    const songListEl = document.getElementById('songList');
    if (!songs || songs.length === 0) {
        songListEl.innerHTML = '<li class="text-light text-center">No se encontraron canciones.</li>';
        return;
    }
    songListEl.innerHTML = songs.map((song, index) => createSongListItem(song, index)).join('');
}

function renderAlbumDetails(album, trackCount) {
    const releaseDate = new Date(album.releaseDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('detailName').textContent = album.title;
    document.getElementById('detailReleaseDate').textContent = releaseDate;
    document.getElementById('detailTotalTracks').textContent = trackCount;
    document.getElementById('detailGenre').textContent = album.genre || "Urbano"; 
}

async function loadAiSummaryLogic(albumId, reviews) {
    const summaryBox = document.getElementById('aiSummary');
    const summaryText = document.getElementById('aiSummaryText');
    if (!reviews || reviews.length <= 2) {
        if(summaryBox) summaryBox.style.display = 'none';
        return;
    }
    if(summaryBox) {
        summaryBox.style.display = 'flex';
        if(summaryText) summaryText.innerHTML = '<em><i class="fas fa-spinner fa-spin"></i> Analizando opiniones con IA...</em>';
    }
    try {
        const data = await generateSongSummary(albumId);
        if (data && data.resumen && summaryText) {
            summaryText.textContent = data.resumen;
        } else if (summaryBox) {
            summaryBox.style.display = 'none';
        }
    } catch (error) {
        if(summaryText) summaryText.textContent = "No se pudo generar el resumen en este momento.";
        if(summaryBox) setTimeout(() => { summaryBox.style.display = 'none'; }, 5000);
    }
}

function renderReviews(reviews) {
    const reviewsListEl = document.getElementById('reviewsList');
    if (!reviews || reviews.length === 0) {
        reviewsListEl.innerHTML = '<p class="text-light text-center">Aún no hay reseñas. ¡Sé el primero!</p>';
        return;
    }
    reviewsListEl.innerHTML = reviews.map(createReviewCard).join('');
    attachReviewActionListeners(reviewsListEl);
    if (currentAlbumData && currentAlbumData.albumId) {
        loadAiSummaryLogic(currentAlbumData.albumId, reviews);
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
                showReviewDetailModal(reviewId);
            }
        });
    });
}

function initializeCreateReviewModal() {
    const btnAgregarResena = document.getElementById('btnAgregarResena');
    const createReviewModalOverlay = document.getElementById('createReviewModalOverlay');
    const closeCreateReviewModal = document.getElementById('closeCreateReviewModal');
    const starsInput = document.getElementById('starsRatingInput');
    const submitReviewBtn = document.getElementById('submitReviewBtn');

    if (btnAgregarResena) btnAgregarResena.addEventListener('click', showCreateReviewModal);
    if (closeCreateReviewModal) closeCreateReviewModal.addEventListener('click', hideCreateReviewModal);
    if (createReviewModalOverlay) {
        createReviewModalOverlay.addEventListener('click', (e) => {
            if (e.target === createReviewModalOverlay) hideCreateReviewModal();
        });
    }
    if (starsInput) {
        starsInput.addEventListener('click', (e) => {
            if (e.target.tagName === 'I') setStarRating(parseInt(e.target.dataset.value));
        });
        starsInput.addEventListener('mouseover', (e) => {
            if (e.target.tagName === 'I') highlightStars(parseInt(e.target.dataset.value));
        });
        starsInput.addEventListener('mouseout', () => highlightStars(currentRating));
    }
    if (submitReviewBtn) submitReviewBtn.addEventListener('click', handleSubmitReview);
}

function showCreateReviewModal() {
    if (!currentAlbumData) {
        showAlert("Error: No se han cargado los datos del álbum.", "danger");
        return;
    }
    const modalOverlay = document.getElementById('createReviewModalOverlay');
    if (!modalOverlay) return;
    document.getElementById('modalAlbumCover').src = currentAlbumData.image || './../../Assets/album-de-musica.png';
    document.getElementById('modalAlbumTitle').textContent = currentAlbumData.title;
    document.getElementById('modalAlbumArtist').textContent = currentAlbumData.artistName;
    document.getElementById('reviewTitleInput').value = '';
    document.getElementById('reviewTextInput').value = '';
    setStarRating(0);
    currentRating = 0;
    clearReviewFormErrors();
    modalOverlay.style.display = 'flex';
}

function hideCreateReviewModal() {
    const modal = document.getElementById('createReviewModalOverlay');
    if (modal) {
        modal.style.display = 'none';
        modal.removeAttribute('data-edit-review-id');
        const modalTitle = modal.querySelector('.review-modal-title');
        if (modalTitle) modalTitle.textContent = 'CREA UNA RESEÑA';
    }
}

function setStarRating(rating) { currentRating = rating; highlightStars(rating); }
function highlightStars(rating) {
    const stars = document.querySelectorAll('#starsRatingInput i');
    stars.forEach(star => {
        const value = parseInt(star.dataset.value);
        star.classList.toggle('fas', value <= rating);
        star.classList.toggle('far', value > rating);
    });
}

function displayFieldError(elementId, message) {
    const inputElement = document.getElementById(elementId);
    if (!inputElement) return;
    const isStarsContainer = elementId === 'starsRatingInput';
    const borderElement = isStarsContainer ? inputElement : inputElement;
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

// --- CORRECCIÓN CRÍTICA EN handleSubmitReview ---
async function handleSubmitReview() {
    // 1. Verificación de Autenticación
    const authToken = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    
    if (!authToken || !userId) {
        showAlert('Debes iniciar sesión para crear una reseña', 'warning');
        showLoginRequiredModal();
        return;
    }
    
    // 2. Obtención de valores del formulario
    const reviewTitle = document.getElementById('reviewTitleInput').value.trim();
    const reviewText = document.getElementById('reviewTextInput').value.trim();
    const rating = currentRating; 

    // 3. Validaciones
    let hasError = false;

    if (!reviewTitle) { 
        displayFieldError('reviewTitleInput', 'El título es obligatorio.'); 
        hasError = true; 
    } else { 
        displayFieldError('reviewTitleInput', null); 
    }

    if (!reviewText) { 
        displayFieldError('reviewTextInput', 'El contenido es obligatorio.'); 
        hasError = true; 
    } else { 
        displayFieldError('reviewTextInput', null); 
    }

    if (rating === 0) { 
        displayFieldError('starsRatingInput', 'Selecciona una calificación.'); 
        hasError = true; 
    } else { 
        displayFieldError('starsRatingInput', null); 
    }

    if (hasError) return;

    // 4. Validación de datos del álbum
    if (!currentAlbumData || !currentAlbumData.albumId) {
        showAlert('Error: No se pudo identificar el álbum.', 'danger');
        return;
    }
    
    // 5. Preparar objeto para el Backend
    const reviewData = {
        Title: reviewTitle,
        Content: reviewText,
        Rating: rating,
        UserId: userId,
        AlbumId: currentAlbumData.albumId, // GUID del álbum
        SongId: null
    };

    const submitBtn = document.getElementById('submitReviewBtn');
    
    try {
        // --- INICIO DEL PROCESO DE ENVÍO ---
        submitBtn.disabled = true;
        submitBtn.textContent = 'GUARDANDO...';

        // A. Crear la Reseña en Social Service
        const response = await createReview(reviewData, authToken);
        
        // B. Guardar datos en localStorage (Para mostrar imagen en el feed inmediatamente)
        const reviewId = response?.ReviewId || response?.reviewId || response?.id;
        if (reviewId) {
             const storageKey = `review_content_${String(reviewId).trim()}`;
             try {
                 const contentData = {
                     type: 'album',
                     id: currentAlbumData.apiAlbumId || currentAlbumData.id, // ID Spotify
                     name: currentAlbumData.title,
                     artist: currentAlbumData.artistName || 'Artista',
                     image: currentAlbumData.image
                 };
                 localStorage.setItem(storageKey, JSON.stringify(contentData));
             } catch (e) {
                 console.warn("No se pudo guardar caché local de imagen", e);
             }
        }
        
        showAlert('¡Reseña enviada con éxito!', 'success');
        hideCreateReviewModal();
        
        // --- C. ESPERA DE SEGURIDAD (RACE CONDITION FIX) ---
        // Damos tiempo a la DB para indexar la nueva calificación antes de pedir el promedio
        submitBtn.textContent = 'SINCRONIZANDO...';
        await new Promise(resolve => setTimeout(resolve, 800));

        // D. ACTUALIZAR RANKING (CONTENT SERVICE)
        try {
            console.log("📡 Obteniendo promedio real actualizado...");
            
            // 1. Pedimos el promedio al Social Service (usando GUID)
            const newAverage = await getAverageRating(currentAlbumData.albumId, 'album');
            
            // 2. Redondeamos para el Content Service (que espera enteros o 0-5)
            const integerRating = Math.round(newAverage); 
            
            console.log(`⭐ Promedio calculado: ${newAverage} -> Guardando: ${integerRating}`);

            if (integerRating > 0) {
                // 3. Usamos el ID de API (Spotify) para actualizar la tabla de Songs/Albums
                const apiId = currentAlbumData.apiAlbumId || currentAlbumData.APIAlbumId || currentAlbumData.id;
                
                if (apiId) {
                    await updateAlbumRating(apiId, integerRating);
                    console.log("✅ Ranking actualizado en Content Service correctamente.");
                } else {
                    console.warn("⚠️ No se encontró API ID para actualizar el ranking.");
                }
            }
        } catch (ratingError) {
            console.error("⚠️ Error no bloqueante sincronizando ranking:", ratingError);
        }
        
        // E. RECARGAR PÁGINA
        // Recargamos todos los datos para que el header muestre las estrellas nuevas y la reseña aparezca
        await loadPageData(); 

    } catch (error) {
        console.error("Error al enviar reseña:", error);
        showAlert(`Error: ${error.message || 'No se pudo enviar la reseña'}`, 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'SUBIR';
    }
}

// ... (Funciones de Modales Comments/Delete igual que antes) ...
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
                const isOwnComment = currentUserId && normalizedCommentUserId && normalizedCommentUserId.toLowerCase() === currentUserId.toLowerCase();
                let actionButtons = isOwnComment ? `
                        <div class="comment-actions">
                            <button class="comment-action-btn comment-edit-btn" data-comment-id="${commentId}" title="Editar"><i class="fas fa-pencil"></i></button>
                            <button class="comment-action-btn comment-delete-btn" data-comment-id="${commentId}" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>` : `
                        <div class="comment-actions">
                            <button class="comment-action-btn comment-report-btn" data-comment-id="${commentId}" title="Reportar"><i class="fas fa-flag"></i></button>
                        </div>`;
                return `
                <div class="comment-item" data-comment-id="${commentId}">
                    <div class="comment-avatar"><img src="../Assets/default-avatar.png" alt="${username}"></div>
                    <div class="comment-content">
                        <div class="comment-header"><span class="comment-username">${username}</span><span class="comment-time">${timeAgo}</span></div>
                        <p class="comment-text" id="comment-text-${commentId}">${text}</p>
                        <div class="comment-footer">
                            <button class="comment-like-btn ${userLiked ? 'liked' : ''}" data-comment-id="${commentId}" title="Me gusta">
                                <i class="fa-solid fa-heart" style="color: ${userLiked ? 'var(--magenta, #EC4899)' : 'rgba(255,255,255,0.6)'};"></i>
                                <span class="comment-likes-count">${likes}</span>
                            </button>
                            ${actionButtons}
                        </div>
                    </div>
                </div>`;
            }).join('');
        }
        attachCommentActionListeners();
    } catch (error) {
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
    if (!commentText) { showAlert('Por favor, escribe un comentario', 'warning'); return; }
    try {
        const authToken = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        await createComment(reviewId, commentText, userId, authToken);
        commentInput.value = '';
        await loadCommentsIntoModal(reviewId);
        showAlert('Comentario agregado exitosamente', 'success');
    } catch (error) { showAlert('Error al agregar el comentario', 'danger'); }
}
    
function attachCommentActionListeners() {
    document.querySelectorAll('.comment-edit-btn').forEach(btn => { btn.addEventListener('click', function() { editComment(this.getAttribute('data-comment-id')); }); });
    document.querySelectorAll('.comment-delete-btn').forEach(btn => { btn.addEventListener('click', function() { deleteComment(this.getAttribute('data-comment-id')); }); });
    document.querySelectorAll('.comment-report-btn').forEach(btn => { btn.addEventListener('click', function() { reportComment(this.getAttribute('data-comment-id')); }); });
    document.querySelectorAll('.comment-like-btn').forEach(btn => { btn.addEventListener('click', function(e) { e.stopPropagation(); toggleCommentLike(this.getAttribute('data-comment-id'), this); }); });
}
    
async function toggleCommentLike(commentId, btn) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) { return showLoginRequiredModal(); }
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
    
function editComment(commentId) { showEditCommentModal(commentId); }
function showEditCommentModal(commentId) {
    const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    const commentTextElement = document.getElementById(`comment-text-${commentId}`);
    if (!commentItem || !commentTextElement || commentItem.classList.contains('editing')) return;
    
    originalCommentText = commentTextElement.textContent.trim();
    editingCommentId = commentId;
    const textarea = document.createElement('textarea');
    textarea.className = 'comment-text-edit';
    textarea.id = `comment-text-edit-${commentId}`;
    textarea.value = originalCommentText;
    textarea.maxLength = 500;
    textarea.rows = 3;
    textarea.setAttribute('data-comment-id', commentId);
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'comment-edit-buttons';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'comment-edit-action-btn comment-edit-cancel';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', (e) => { e.preventDefault(); cancelEditComment(commentId); });
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'comment-edit-action-btn comment-edit-confirm';
    confirmBtn.textContent = 'Confirmar';
    confirmBtn.addEventListener('click', (e) => { e.preventDefault(); confirmEditComment(commentId); });
    
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
}
    
async function confirmEditComment(commentId) {
    if (!commentId) commentId = editingCommentId;
    const modal = document.getElementById('commentsModalOverlay');
    const reviewId = modal ? modal.getAttribute('data-review-id') : null;
    const textarea = document.getElementById(`comment-text-edit-${commentId}`);
    if (!reviewId || !textarea) return;
    const newText = textarea.value.trim();
    if (!newText) { showAlert('El comentario no puede estar vacío', 'warning'); return; }
    try {
        await updateCommentInData(reviewId, commentId, newText);
        await loadCommentsIntoModal(reviewId);
        showAlert('Comentario editado exitosamente', 'success');
    } catch (error) { showAlert('Error al actualizar el comentario.', 'danger'); }
    editingCommentId = null;
}
    
async function updateCommentInData(reviewId, commentId, newText) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) throw new Error("No autenticado");
    await updateComment(commentId, newText, authToken);
}

function initializeDeleteModalsLogic() {
    const cancelDeleteCommentBtn = document.getElementById('cancelDeleteCommentBtn');
    const confirmDeleteCommentBtn = document.getElementById('confirmDeleteCommentBtn');
    const deleteCommentModalOverlay = document.getElementById('deleteCommentModalOverlay');
    if (cancelDeleteCommentBtn) cancelDeleteCommentBtn.addEventListener('click', hideDeleteCommentModal);
    if (confirmDeleteCommentBtn) confirmDeleteCommentBtn.addEventListener('click', confirmDeleteComment);
    if (deleteCommentModalOverlay) deleteCommentModalOverlay.addEventListener('click', (e) => { if (e.target === deleteCommentModalOverlay) hideDeleteCommentModal(); });
    
    const cancelDeleteReviewBtn = document.getElementById('cancelDeleteReviewBtn');
    const confirmDeleteReviewBtn = document.getElementById('confirmDeleteReviewBtn');
    const deleteReviewModalOverlay = document.getElementById('deleteReviewModalOverlay');
    if (cancelDeleteReviewBtn) cancelDeleteReviewBtn.addEventListener('click', hideDeleteReviewModal);
    if (confirmDeleteReviewBtn) confirmDeleteReviewBtn.addEventListener('click', confirmDeleteReview);
    if (deleteReviewModalOverlay) deleteReviewModalOverlay.addEventListener('click', (e) => { if (e.target === deleteReviewModalOverlay) hideDeleteReviewModal(); });
}

function showDeleteCommentModal(commentId) { deletingCommentId = commentId; const modal = document.getElementById('deleteCommentModalOverlay'); if(modal) modal.style.display = 'flex'; }
function hideDeleteCommentModal() { const modal = document.getElementById('deleteCommentModalOverlay'); if(modal) modal.style.display = 'none'; deletingCommentId = null; }
async function confirmDeleteComment() {
    if (!deletingCommentId) return;
    const modal = document.getElementById('commentsModalOverlay');
    const reviewId = modal ? modal.getAttribute('data-review-id') : null;
    const authToken = localStorage.getItem('authToken');
    try {
        await deleteComment(deletingCommentId, authToken);
        hideDeleteCommentModal();
        await loadCommentsIntoModal(reviewId);
        showAlert('Comentario eliminado exitosamente', 'success');
    } catch (error) { hideDeleteCommentModal(); showAlert('Error al eliminar el comentario', 'danger'); }
}
    
function showDeleteReviewModal(reviewId, reviewTitle) {
    if (!reviewId) return;
    reviewId = String(reviewId).trim();
    deletingReviewId = reviewId;
    const modal = document.getElementById('deleteReviewModalOverlay');
    const messageElement = document.getElementById('deleteReviewMessage');
    if (modal && messageElement) {
        messageElement.textContent = `¿Estás seguro de que quieres eliminar la reseña "${reviewTitle}"? Esta acción no se puede deshacer.`;
        modal.style.display = 'flex';
    }
}
    
function hideDeleteReviewModal() {
    const modal = document.getElementById('deleteReviewModalOverlay');
    if (modal) modal.style.display = 'none';
    deletingReviewId = null;
}
    
async function confirmDeleteReview() {
    if (!deletingReviewId) return;
    const reviewIdToDelete = deletingReviewId;
    hideDeleteReviewModal();
    await deleteReviewLogic(reviewIdToDelete);
}
    
async function deleteReviewLogic(reviewId) {
    const userId = localStorage.getItem('userId');
    const authToken = localStorage.getItem('authToken');
    if (!userId || !authToken) { showAlert('Debes iniciar sesión para eliminar reseñas', 'warning'); return; }
    try {
        await deleteReview(reviewId, userId, authToken);
        showAlert('Reseña eliminada exitosamente', 'success');
        await loadPageData(); 
    } catch (error) { showAlert('Error al eliminar la reseña.', 'danger'); }
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
    const totalRating = reviews.reduce((sum, review) => sum + Number(review.rating || review.Rating || 0), 0);
    const rawAverage = totalRating / reviews.length;
    const roundedAverage = Math.round(rawAverage * 2) / 2;
    ratingNumberEl.textContent = roundedAverage.toFixed(1); 
    ratingStarsEl.innerHTML = createStarRating(roundedAverage, true); 
    ratingCountEl.textContent = `(${reviews.length} reviews)`;
}