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
import { initializeCreateReviewModal, showCreateReviewModal, showEditReviewModal } from '../Components/modals/createReviewModal.js';
import { initializeCommentsModalLogic, showCommentsModal } from '../Components/modals/commentsModal.js';
import { initializeReviewDetailModalLogic, showReviewDetailModal } from '../Components/modals/reviewDetailModal.js';
import { initializeDeleteModalsLogic, showDeleteReviewModal } from '../Components/modals/deleteModals.js';

let currentRating = 0;
let currentAlbumData = null;  
let commentsData = {}; 

// Función para recargar reseñas después de crear/editar (debe estar antes de modalsState)
async function reloadAlbumReviews() {
    if (!currentAlbumData || !currentAlbumData.albumId) return;
    
    try {
        const allReviews = await getReviews();
        const filteredReviews = allReviews.filter(review => {
            return (review.albumId === currentAlbumData.albumId || review.AlbumId === currentAlbumData.albumId);
        });

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
                        contentType: 'Álbum',
                        song: currentAlbumData.title,
                        artist: currentAlbumData.artistName,
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
        renderReviews(reviewsData.filter(r => r !== null));
        updateHeaderStatistics(reviewsData);
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
    loadReviews: reloadAlbumReviews // Función para recargar reseñas después de crear/editar
};

//  ---  INICIO  DE  LA  APLICACIÓN  ---
export function initializeAlbumPage() {
    console.log("Inicializando lógica de Album...");
    initializeTabNavigation();
    loadPageData(); 
    
    // Inicializar modals con el estado compartido (igual que en homeAdmin.js)
    initializeCreateReviewModal(modalsState);
    initializeCommentsModalLogic(modalsState);
    initializeReviewDetailModalLogic(modalsState);
    initializeDeleteModalsLogic(modalsState);
    
    // Configurar botón de crear reseña específico de album (si existe)
    const btnAgregarResena = document.getElementById('btnAgregarResena');
    if (btnAgregarResena) {
        btnAgregarResena.addEventListener('click', () => {
            if (currentAlbumData) {
                const contentData = {
                    type: 'album',
                    id: currentAlbumData.apiAlbumId || currentAlbumData.id,
                    name: currentAlbumData.title || '',
                    artist: currentAlbumData.artistName || '',
                    image: currentAlbumData.image || ''
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
                        contentType: 'Álbum',
                        song: albumData.title,
                        artist: albumData.artistName, 
                        title: review.title || review.Title,
                        comment: review.content || review.Content,
                        rating: review.rating || review.Rating,
                        likes: likes,
                        comments: comments.length,
                        userLiked: userLiked,
                        userId: userId
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
                const newLikesCount = currentLikes + 1;
                likesSpan.textContent = newLikesCount;
                localStorage.setItem(`like_${reviewId}_${currentUserId}`, 'true');
                try {
                    const data = await addReviewReaction(reviewId, currentUserId, authToken);
                    const reactionId = data?.Id_Reaction || data?.ReactionId || data?.id;
                    if (reactionId) {
                        localStorage.setItem(`reaction_${reviewId}_${currentUserId}`, reactionId);
                    }
                } catch (err) { console.warn('No se pudo guardar like en el backend', err); }
                
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
            }
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

// NOTA: initializeCreateReviewModal, showCreateReviewModal, showEditReviewModal ahora se importan de Components/modals/createReviewModal.js
// Las funciones locales fueron eliminadas para evitar conflictos

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

// NOTA: initializeCommentsModalLogic, showCommentsModal ahora se importan de Components/modals/commentsModal.js
// Las funciones locales fueron eliminadas para evitar conflictos

// NOTA: initializeDeleteModalsLogic, showDeleteReviewModal ahora se importan de Components/modals/deleteModals.js
// Las funciones locales fueron eliminadas para evitar conflictos

// Función local para confirmar eliminación de reseña (específica de album)
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