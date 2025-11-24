import {
    getAlbumByApiId,
    getAlbumSongsByApiId,
    getOrCreateAlbum,
    updateAlbumRating 
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
    getUser
} from './../APIs/socialApi.js';
import { showAlert, showLoginRequiredModal } from '../Handlers/headerHandler.js';
import { formatNotificationTime } from '../Handlers/headerHandler.js'; 

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
    loadPageData(); // Función principal modificada
    
    // Inicializar modals de esta página
    initializeCommentsModalLogic();
    initializeDeleteModalsLogic();
};


async function loadPageData() {
    const loadingEl = document.getElementById('loadingSpinner');
    const contentEl = document.getElementById('albumContent');
    
    try {
        // 1. Obtener el ID de la URL
        const params = new URLSearchParams(window.location.search);
        const apiAlbumId = params.get('id'); 
        
        // Validación estricta del ID
        if (!apiAlbumId || apiAlbumId.trim() === '' || 
            apiAlbumId === 'undefined' || apiAlbumId === 'null' ||
            apiAlbumId.toLowerCase() === 'album' || apiAlbumId.toLowerCase() === 'artist') {
            throw new Error("ID de álbum inválido. Busca nuevamente.");
        }
        
        console.log(`Cargando álbum con ID: ${apiAlbumId}`);

        // 2. Mostrar Spinner
        contentEl.style.display = 'none';
        loadingEl.style.display = 'block';

        // 3. Obtener datos principales del álbum
        const albumData = await getAlbumByApiId(apiAlbumId);
        currentAlbumData = albumData; // Guardamos globalmente
        const localAlbumId = albumData.albumId; 

        renderAlbumHeader(albumData);
        
        // 5. Obtener canciones y reseñas en paralelo
        const [songsData, allReviews] = await Promise.all([
            getAlbumSongsByApiId(apiAlbumId),
            getReviews()
        ]);

        // 6. Filtrar reseñas
        const filteredReviews = allReviews.filter(review => {
            return (review.albumId === localAlbumId || review.AlbumId === localAlbumId);
        });

        // 7. Enriquecer reseñas 
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
                    console.warn("Error procesando una reseña individual:", error);
                    return null;
                }
            })
        );

        const validReviews = reviewsData.filter(r => r !== null);

        // Actualizar estadísticas (estrellas) con el cálculo de promedio
        updateHeaderStatistics(filteredReviews);

        // 8. Renderizar resto del contenido
        renderSongList(songsData);
        renderAlbumDetails(albumData, songsData ? songsData.length : 0);
        renderReviews(validReviews);

        // 9. Finalizar carga
        contentEl.style.display = 'block';
        
    } catch (error) {
        console.error("Error fatal:", error);
        contentEl.innerHTML = `<h2 class="text-light text-center py-5">Error: ${error.message}</h2>`;
        contentEl.style.display = 'block';
    } finally {
        loadingEl.style.display = 'none';
    }
}

//  ---  FUNCIONES  DE  RENDERIZADO  (Sin  cambios)  ---

function renderAlbumHeader(album) {
    // 1. Imagen y Título 
    document.getElementById('albumCover').src = album.image || album.Image || '../Assets/album-de-musica.png';
    document.getElementById('albumTitle').textContent = album.title || album.Title;
    
    const artistLink = document.getElementById('albumArtistLink');
    
    const artistName = album.artistName || 
                    album.ArtistName || 
                    (album.artist ? (album.artist.name || album.artist.Name) : null) ||
                    (album.Artist ? (album.Artist.Name || album.Artist.name) : null) ||
                    "Artista Desconocido";

    artistLink.textContent = artistName;
    const artistId = album.apiArtistId || 
                    album.ApiArtistId || 
                    (album.artist ? album.artist.id : null) ||
                    (album.Artist ? album.Artist.Id : null);

    if (artistId) {
        artistLink.href = `./artist.html?id=${artistId}`;
    } else {
        artistLink.href = '#'; // Si no hay ID, que no lleve a ningun lado
        artistLink.style.pointerEvents = 'none'; // Deshabilitar click visualmente
    }

    // Estadísticas 
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
    const releaseDate = new Date(album.releaseDate).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    
    document.getElementById('detailName').textContent = album.title;
    document.getElementById('detailReleaseDate').textContent = releaseDate;
    document.getElementById('detailTotalTracks').textContent = trackCount;
    document.getElementById('detailGenre').textContent = album.genre || "Urbano"; 
}

async function loadAiSummaryLogic(albumId, reviews) {
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
        const data = await generateSongSummary(albumId);
        
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

function renderReviews(reviews) {
    const reviewsListEl = document.getElementById('reviewsList');
    if (!reviews || reviews.length === 0) {
        reviewsListEl.innerHTML = '<p class="text-light text-center">Aún no hay reseñas. ¡Sé el primero!</p>';
        return;
    }
    reviewsListEl.innerHTML = reviews.map(createReviewCard).join('');
    
    // Llama a la función para agregar los listeners
    attachReviewActionListeners(reviewsListEl);

    if (currentSongData && currentSongData.albumId) {
        loadAiSummaryLogic(currentSongData.albumId, reviews);
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
                } catch (err) {
                    console.warn('No se pudo eliminar like del backend', err);
                }
            } else {
                this.classList.add('liked');
                icon.style.color = 'var(--magenta, #EC4899)';
                const currentLikes = parseInt(likesSpan.textContent) || 0;
                likesSpan.textContent = currentLikes + 1;
                
                localStorage.setItem(`like_${reviewId}_${currentUserId}`, 'true'); // Fallback
                
                try {
                    const data = await addReviewReaction(reviewId, currentUserId, authToken);
                    const reactionId = data?.Id_Reaction || data?.ReactionId || data?.id;
                    if (reactionId) {
                        localStorage.setItem(`reaction_${reviewId}_${currentUserId}`, reactionId);
                    }
                } catch (err) {
                    console.warn('No se pudo guardar like en el backend', err);
                }
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
    
    reviewsListElement.querySelectorAll('.btn-report').forEach(btn => {
        btn.addEventListener('click', function() {
            const reviewId = this.getAttribute('data-review-id');
            reportReview(reviewId);
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
            if (e.target.closest('.review-actions') || e.target.closest('.btn-edit') || e.target.closest('.btn-delete') || e.target.closest('.btn-report') || e.target.closest('.btn-like') || e.target.closest('.comment-btn')) {
                return;
            }
            
            const reviewId = this.getAttribute('data-review-id');
            if (reviewId) {
                showReviewDetailModal(reviewId);
            }
        });
    });
}

// --- MODAL DE CREAR/EDITAR RESEÑA ---

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

    // Rellenar la info del modal
    document.getElementById('modalAlbumCover').src = currentAlbumData.image || './../../Assets/album-de-musica.png';
    document.getElementById('modalAlbumTitle').textContent = currentAlbumData.title;
    document.getElementById('modalAlbumArtist').textContent = currentAlbumData.artistName;

    // Resetear formulario
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

function setStarRating(rating) {
    currentRating = rating;
    highlightStars(rating);
}

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

    // 'starsRatingInput' es especial, se trata como contenedor
    const isStarsContainer = elementId === 'starsRatingInput';
    
    // 1. Elemento donde se aplica el BORDE ROJO
    const borderElement = isStarsContainer ? inputElement : inputElement;

    // 2. Elemento donde se muestra el MENSAJE ROJO
    const errorElementId = (elementId === 'starsRatingInput') ? 'reviewRatingError' : elementId.replace('Input', 'Error');
    const errorElement = document.getElementById(errorElementId);
    
    if (message) {
        // Mostrar Error
        borderElement.classList.add('is-invalid-custom'); 
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show-error'); 
        }
    } else {
        // Ocultar Error
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
        showLoginRequiredModal();
        return;
    }
    
    const reviewTitle = document.getElementById('reviewTitleInput').value.trim();
    const reviewText = document.getElementById('reviewTextInput').value.trim();
    const rating = currentRating; 

    let hasError = false;

    // 1. Validar Título
    if (!reviewTitle) {
        displayFieldError('reviewTitleInput', 'El título de la reseña es obligatorio.');
        hasError = true;
    } else {
        displayFieldError('reviewTitleInput', null);
    }

    // 2. Validar Texto
    if (!reviewText) {
        displayFieldError('reviewTextInput', 'El contenido de la reseña es obligatorio.');
        hasError = true;
    } else {
        displayFieldError('reviewTextInput', null);
    }

    // 3. Validar Calificación
    if (rating === 0) { 
        displayFieldError('starsRatingInput', 'Debes seleccionar una calificación (1-5 estrellas).');
        hasError = true;
    } else {
        displayFieldError('starsRatingInput', null); 
    }

    if (hasError) {
        return;
    }

    if (!currentAlbumData || !currentAlbumData.albumId) {
        showAlert('Error: No se pudo identificar el álbum. Refresca la página.', 'danger');
        return;
    }
    
    const reviewData = {
        Title: reviewTitle,
        Content: reviewText,
        Rating: rating,
        UserId: userId,
        AlbumId: currentAlbumData.albumId,
        SongId: null
    };

    const submitBtn = document.getElementById('submitReviewBtn');
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'SUBIENDO...';

        // 6. Llamar a la API
        const response = await createReview(reviewData, authToken);
        

        const reviewId = response?.ReviewId || response?.reviewId || response?.Id_Review || response?.id;
        if (reviewId) {
            const storageKey = `review_content_${String(reviewId).trim()}`;
            try {
                // Debug: ver qué campos tiene currentAlbumData
                console.log('🔍 currentAlbumData completo:', currentAlbumData);
                
                // Obtener artista de todas las posibles fuentes 
                let artistName = currentAlbumData.ArtistName || 
                                currentAlbumData.artistName || 
                                (currentAlbumData.artist ? (currentAlbumData.artist.name || currentAlbumData.artist.Name) : null) ||
                                (currentAlbumData.Artist ? (currentAlbumData.Artist.Name || currentAlbumData.Artist.name) : null);
                
                // Si no hay artista directo, intentar desde las canciones del álbum
                if (!artistName && currentAlbumData.Songs && currentAlbumData.Songs.length > 0) {
                    const firstSong = currentAlbumData.Songs[0];
                    artistName = firstSong.ArtistName || 
                                firstSong.artistName ||
                                (firstSong.artist ? (firstSong.artist.name || firstSong.artist.Name) : null) ||
                                (firstSong.Artist ? (firstSong.Artist.Name || firstSong.Artist.name) : null);
                }
                
                artistName = artistName || 'Artista';
                
                const contentData = {
                    type: 'album',
                    id: currentAlbumData.apiAlbumId || currentAlbumData.APISongId || currentAlbumData.id,
                    name: currentAlbumData.title || currentAlbumData.Title || 'Álbum',
                    artist: artistName,
                    image: currentAlbumData.image || currentAlbumData.Image || null
                };
                
                localStorage.setItem(storageKey, JSON.stringify(contentData));
                console.log(`💾 Datos del contenido guardados en localStorage: ${storageKey}`, contentData);
            } catch (e) {
                console.warn('Error guardando datos en localStorage:', e);
            }
        }
        
        showAlert('¡Reseña enviada con éxito!', 'success');
        hideCreateReviewModal();
        
        const allReviews = await getReviews();
        const filteredReviews = allReviews.filter(r => r.albumId === currentAlbumData.albumId || r.AlbumId === currentAlbumData.albumId);
        if (filteredReviews.length > 0) {
            const totalRating = filteredReviews.reduce((sum, review) => {
                const r = review.rating || review.Rating || 0;
                return sum + Number(r);
            }, 0);
            
            // Promedio exacto
            const rawAverage = totalRating / filteredReviews.length;
            const integerRating = Math.round(rawAverage);

            console.log(`📡 Actualizando Ranking del Álbum a: ${integerRating} (Promedio real: ${rawAverage})`);

            try {
                // Usamos apiAlbumId (ID de Spotify) porque es lo que espera tu endpoint UpdateAlbumRating
                await updateAlbumRating(currentAlbumData.apiAlbumId, integerRating);
            } catch (err) {
                console.error("Error actualizando el rating en ContentService:", err);
            }
        }
        
        updateHeaderStatistics(filteredReviews);
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
                        song: currentAlbumData.title, // Nombre del álbum
                        artist: currentAlbumData.artistName, // Nombre del artista
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

        renderReviews(validReviews); // 8. Renderizar datos COMPLETOS

    } catch (error) {
        console.error("Error al enviar la reseña:", error);
        if (error.response?.status === 409) {
            showAlert('Ya has enviado una reseña para este álbum.', 'warning');
        } else {
            showAlert(`Error al enviar la reseña: ${error.message}`, 'danger');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'SUBIR';
    }
}

// (Estas funciones son necesarias para renderReviews y attach...Listeners)

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
                    actionButtons = `
                        <div class="comment-actions">
                            <button class="comment-action-btn comment-report-btn" data-comment-id="${commentId}" title="Reportar"><i class="fas fa-flag"></i></button>
                        </div>
                    `;
                }
                
                return `
                <div class="comment-item" data-comment-id="${commentId}">
                    <div class="comment-avatar"><img src="../Assets/default-avatar.png" alt="${username}"></div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <span class="comment-username">${username}</span>
                            <span class="comment-time">${timeAgo}</span>
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
    
    document.querySelectorAll('.comment-report-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const commentId = this.getAttribute('data-comment-id');
            reportComment(commentId);
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
Read   }
        
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
    
// --- MODAL DE BORRAR RESEÑA ---

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
}

/**
 * Calcula el promedio de estrellas basado en el array de reseñas
 * y actualiza el DOM del header.
 */
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


