/**
 * Módulo del modal de crear/editar reseña
 * Maneja la creación y edición de reseñas
 */

import { fetchSearchResults } from '../../APIs/searchApi.js';
import { createReview, updateReview, getAverageRating } from '../../APIs/socialApi.js';
import { getOrCreateSong, getOrCreateAlbum, updateSongRating, updateAlbumRating } from '../../APIs/contentApi.js';
import { showAlert } from '../../Utils/reviewHelpers.js';
import { setReviewFilter } from '../reviews/reviewUtils.js';

/**
 * Inicializa el modal de crear/editar reseña
 * @param {Object} state - Objeto con estado compartido (currentReviewData, loadReviews)
 */
export function initializeCreateReviewModal(state) {
    // Validar que state existe, si no crear uno por defecto
    if (!state) {
        console.warn('⚠️ initializeCreateReviewModal: state no proporcionado, creando uno por defecto');
        state = {
            currentReviewData: null,
            currentRating: 0
        };
    }
    
    const addReviewBtn = document.getElementById('addReviewBtn');
    const closeCreateReviewModal = document.getElementById('closeCreateReviewModal');
    const createReviewModalOverlay = document.getElementById('createReviewModalOverlay');
    const submitCreateReviewBtn = document.getElementById('submitCreateReviewBtn');
    const createReviewStars = document.getElementById('createReviewStars');
    const contentSearchInput = document.getElementById('contentSearchInput');
    const contentSearchDropdown = document.getElementById('contentSearchDropdown');
    const changeContentBtn = document.getElementById('changeContentBtn');
    
    if (addReviewBtn) {
        addReviewBtn.addEventListener('click', () => showCreateReviewModal(null, state));
    }
    if (closeCreateReviewModal) {
        closeCreateReviewModal.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            hideCreateReviewModal(state);
        });
    }
    if (createReviewModalOverlay) {
        createReviewModalOverlay.addEventListener('click', (e) => {
            // Cerrar solo si se hace click directamente en el overlay, no en sus hijos
            if (e.target === createReviewModalOverlay) {
                e.preventDefault();
                e.stopPropagation();
                hideCreateReviewModal(state);
            }
        });
    }
    
    if (submitCreateReviewBtn) {
        submitCreateReviewBtn.addEventListener('click', (e) => {
            console.log('🔘 Botón de crear reseña clickeado');
            e.preventDefault();
            submitCreateReview(state);
        });
    }
    
    if (changeContentBtn) {
        changeContentBtn.addEventListener('click', () => {
            document.getElementById('createReviewContentSelector').style.display = 'block';
            document.getElementById('createReviewContentInfo').style.display = 'none';
            if (contentSearchInput) {
                contentSearchInput.value = '';
                contentSearchInput.focus();
            }
            state.currentReviewData = null;
        });
    }
    
    // Inicializar búsqueda de contenido dentro del modal
    if (contentSearchInput) {
        let searchTimeout;
        let currentSearchController = null;
        
        contentSearchInput.addEventListener('input', function() {
            if (currentSearchController) {
                currentSearchController.abort();
            }
            clearTimeout(searchTimeout);
            
            if (this.value.length > 0) {
                currentSearchController = new AbortController();
                searchTimeout = setTimeout(() => {
                    performContentSearch(this.value.trim(), currentSearchController.signal, state || {});
                }, 500);
            } else {
                if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
            }
        });
        
        document.addEventListener('click', (e) => {
            if (contentSearchInput && contentSearchDropdown && !contentSearchInput.contains(e.target) && !contentSearchDropdown.contains(e.target)) {
                if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
            }
        });
    }
    
    // Inicializar estrellas del modal
    if (createReviewStars) {
        // Guardar referencia al estado de rating en el objeto state
        if (state && !state.currentRating) {
            state.currentRating = 0;
        }
        
        const stars = createReviewStars.querySelectorAll('.star-input');
        
        if (stars.length === 0) {
            console.warn('⚠️ No se encontraron estrellas con la clase .star-input');
            return;
        }
        
        let currentRating = 0; // Variable local como fallback si state no existe
        
        function highlightStars(rating) {
            stars.forEach((star, index) => {
                star.classList.toggle('active', (index + 1) <= rating);
            });
        }
        
        function updateStarRating(rating) {
            currentRating = rating;
            if (state) {
                state.currentRating = rating;
            }
            highlightStars(rating);
        }
            
        stars.forEach((star) => {
            star.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const rating = parseInt(this.getAttribute('data-rating')) || 0;
                updateStarRating(rating);
            });
            star.addEventListener('mouseenter', function() {
                const rating = parseInt(this.getAttribute('data-rating')) || 0;
                highlightStars(rating);
            });
        });
        
        createReviewStars.addEventListener('mouseleave', () => {
            highlightStars(state ? (state.currentRating || 0) : currentRating);
        });
    }
}

/**
 * Busca contenido usando la API de búsqueda
 */
async function performContentSearch(query, signal, state) {
    const contentSearchDropdown = document.getElementById('contentSearchDropdown');
    if (!query || query.length === 0) {
        if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
        return;
    }
    
    console.log('🔍 Buscando contenido:', query);
    
    if (contentSearchDropdown) {
        contentSearchDropdown.innerHTML = '<div class="search-loading">Buscando...</div>';
        contentSearchDropdown.style.display = 'block';
    }
    
    try {
        const results = await fetchSearchResults(query, signal);
        if(results === null) {
            console.log('🔍 Búsqueda cancelada');
            return; // Búsqueda cancelada
        }
        console.log('🔍 Resultados de búsqueda:', results);
        displayContentSearchResults(results, query, state);
    } catch (error) {
        console.error('❌ Error en la búsqueda del modal:', error);
        if (contentSearchDropdown) {
            contentSearchDropdown.innerHTML = `
                <div class="search-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Error al buscar. Intenta nuevamente.</span>
                </div>
            `;
            contentSearchDropdown.style.display = 'block';
        }
    }
}
            
/**
 * Muestra los resultados de búsqueda en el dropdown del modal
 */
function displayContentSearchResults(results, query, state) {
    const contentSearchDropdown = document.getElementById('contentSearchDropdown');
    
    const albums = results.Albums || results.albums || [];
    const songs = results.Songs || results.songs || [];
    
    if (albums.length === 0 && songs.length === 0) {
        if (contentSearchDropdown) {
            contentSearchDropdown.innerHTML = `
                <div class="search-no-results">
                    <i class="fas fa-search"></i>
                    <span>No se encontraron resultados para "${query}"</span>
                </div>
            `;
            contentSearchDropdown.style.display = 'block';
        }
        return;
    }
    
    let html = '';
    
    // Canciones primero (como en Spotify)
    if (songs.length > 0) {
        songs.forEach(song => {
            const songId = song.apiSongId || song.APISongId || song.APIId || song.apiId || song.Id || song.id || song.SongId || song.songId || '';
            const songTitle = song.Title || song.title || song.Name || song.name || '';
            const songImage = song.Image || song.image || song.AlbumImage || song.albumImage || '../Assets/default-avatar.png';
            const artistName = song.ArtistName || song.artistName || song.Artist || song.artist || '';
            const subtitle = artistName ? `Canción • ${artistName}` : 'Canción';
            
            if (!songId) {
                console.warn('⚠️ Canción sin ID:', song);
            }
            
            html += `
                <div class="content-search-item" data-type="song" data-id="${songId}" data-name="${songTitle}" data-image="${songImage}" data-artist="${artistName}">
                    <img src="${songImage}" alt="${songTitle}" class="content-search-item-image" onerror="this.src='../Assets/default-avatar.png'">
                    <div class="content-search-item-text">
                        <div class="content-search-item-name">${songTitle}</div>
                        <div class="content-search-item-type">${subtitle}</div>
                    </div>
                    <i class="fas fa-plus content-search-item-icon"></i>
                </div>
            `;
        });
    }
    
    // Álbumes después
    if (albums.length > 0) {
        albums.forEach(album => {
            const albumId = album.apiAlbumId || album.APIAlbumId || album.Id || album.id || album.AlbumId || album.albumId || '';
            const albumTitle = album.Title || album.title || album.Name || album.name || '';
            const albumImage = album.Image || album.image || '../Assets/default-avatar.png';
            const artistName = album.ArtistName || album.artistName || album.Artist || album.artist || '';
            const subtitle = artistName ? `Álbum • ${artistName}` : 'Álbum';
            
            if (!albumId) {
                console.warn('⚠️ Álbum sin ID:', album);
            }
            
            html += `
                <div class="content-search-item" data-type="album" data-id="${albumId}" data-name="${albumTitle}" data-image="${albumImage}" data-artist="${artistName}">
                    <img src="${albumImage}" alt="${albumTitle}" class="content-search-item-image" onerror="this.src='../Assets/default-avatar.png'">
                    <div class="content-search-item-text">
                        <div class="content-search-item-name">${albumTitle}</div>
                        <div class="content-search-item-type">${subtitle}</div>
                    </div>
                    <i class="fas fa-plus content-search-item-icon"></i>
                </div>
            `;
        });
    }
    
    if (contentSearchDropdown) {
        contentSearchDropdown.innerHTML = html;
        contentSearchDropdown.style.display = 'block';
        
        contentSearchDropdown.querySelectorAll('.content-search-item').forEach(item => {
            item.addEventListener('click', function() {
                const contentType = this.getAttribute('data-type');
                
                if (contentType === 'artist') {
                    showAlert('No se pueden crear reseñas de artistas. Por favor, selecciona una canción o un álbum.', 'warning');
                    return;
                }
                
                const contentId = this.getAttribute('data-id');
                const contentName = this.getAttribute('data-name');
                const contentImage = this.getAttribute('data-image');
                const contentArtist = this.getAttribute('data-artist') || '';
                
                console.log('🎵 Contenido seleccionado:', { type: contentType, id: contentId, name: contentName, image: contentImage, artist: contentArtist });
                
                if (!contentId || contentId === '00000000-0000-0000-0000-000000000000' || contentId.trim() === '') {
                    console.error('❌ Error: El ID del contenido está vacío o es un GUID vacío');
                    showAlert('Error: No se pudo obtener el ID del contenido. El backend no está devolviendo un ID válido.', 'warning');
                    return;
                }
                
                const contentData = {
                    type: contentType,
                    id: contentId,
                    name: contentName,
                    image: contentImage,
                    artist: contentArtist
                };
                
                setSelectedContent(contentData, state);
                const contentSearchInput = document.getElementById('contentSearchInput');
                if (contentSearchInput) contentSearchInput.value = contentName;
            });
        });
    }
}

/**
 * Muestra el modal de "Crear Reseña", opcionalmente precargado con datos.
 */
export function showCreateReviewModal(contentData = null, state) {
    const modal = document.getElementById('createReviewModalOverlay');
    const contentSelector = document.getElementById('createReviewContentSelector');
    const contentInfo = document.getElementById('createReviewContentInfo');
    const contentSearchInput = document.getElementById('contentSearchInput');
    const contentSearchDropdown = document.getElementById('contentSearchDropdown');
    
    if (!modal) return;
    
    if (contentData && contentData.type === 'artist') {
        showAlert('No se pueden crear reseñas de artistas. Por favor, selecciona una canción o un álbum.', 'warning');
        return;
    }
    
    if (contentData) {
        if (state) {
            setSelectedContent(contentData, state);
        }
    } else {
        if (state) {
            state.currentReviewData = null;
        }
        if (contentSelector) contentSelector.style.display = 'block';
        if (contentInfo) contentInfo.style.display = 'none';
        if (contentSearchInput) contentSearchInput.value = '';
        if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
    }
    
    const titleInput = document.getElementById('createReviewTitleInput');
    const textInput = document.getElementById('createReviewTextInput');
    if (titleInput) titleInput.value = '';
    if (textInput) textInput.value = '';
    
    // Resetear estrellas
    const stars = document.querySelectorAll('#createReviewStars .star-input');
    if (stars.length > 0) {
        stars.forEach(star => star.classList.remove('active'));
    }
    if (state) {
        state.currentRating = 0;
    }
    
    modal.style.display = 'flex';
}
    
/**
 * Guarda los datos del contenido seleccionado y actualiza la UI del modal.
 */
function setSelectedContent(contentData, state) {
    if (contentData && contentData.type === 'artist') {
        showAlert('No se pueden crear reseñas de artistas.', 'warning');
        return;
    }
    
    if (state) {
        state.currentReviewData = contentData;
    }
    
    const contentSelector = document.getElementById('createReviewContentSelector');
    const contentInfo = document.getElementById('createReviewContentInfo');
    const contentInfoImage = document.getElementById('contentInfoImage');
    const contentInfoName = document.getElementById('contentInfoName');
    const contentInfoType = document.getElementById('contentInfoType');
    const contentSearchDropdown = document.getElementById('contentSearchDropdown');
    
    if (contentSelector) contentSelector.style.display = 'none';
    if (contentInfo) contentInfo.style.display = 'flex';
    if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
    
    if (contentInfoImage) {
        contentInfoImage.src = contentData.image || '../Assets/default-avatar.png';
        contentInfoImage.onerror = function() { this.src = '../Assets/default-avatar.png'; };
    }
    
    if (contentInfoName) {
        contentInfoName.textContent = contentData.name || 'Nombre';
    }
    
    if (contentInfoType) {
        const typeText = contentData.type === 'album' ? 'ÁLBUM' : 'CANCIÓN';
        contentInfoType.textContent = typeText;
    }
    
    if (contentInfo) {
        contentInfo.classList.remove('content-info-artist');
        if (contentInfoImage) {
            contentInfoImage.style.borderRadius = '8px';
        }
    }
}
    
/**
 * Cierra y resetea el modal de "Crear Reseña".
 */
function hideCreateReviewModal(state) {
    const modal = document.getElementById('createReviewModalOverlay');
    if (modal) {
        modal.style.display = 'none';
        modal.removeAttribute('data-edit-review-id');
        const modalTitle = modal.querySelector('.create-review-title');
        if (modalTitle) {
            modalTitle.textContent = 'Crear Reseña';
        }
    }
    if (state) {
        state.currentReviewData = null;
    }
}
    
/**
 * Envía la reseña (nueva o editada) al backend.
 */
async function submitCreateReview(state) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        console.warn('⚠️ No hay token de autenticación');
        showAlert('Debes iniciar sesión para crear una reseña', 'warning');
        return;
    }
    
    // --- Validación de Inputs ---
    const titleInput = document.getElementById('createReviewTitleInput');
    const textInput = document.getElementById('createReviewTextInput');
    const createReviewStars = document.getElementById('createReviewStars');
    
    const title = titleInput ? titleInput.value.trim() : '';
    const content = textInput ? textInput.value.trim() : '';
    
    let rating = 0;
    // Primero intentar obtener el rating del estado
    if (state && state.currentRating) {
        rating = state.currentRating;
    } else if (createReviewStars) {
        // Fallback: contar estrellas activas
        const activeStars = createReviewStars.querySelectorAll('.star-input.active');
        rating = activeStars.length;
    }
    
    if (!title) {
        showAlert('Por favor, ingresa un título para la reseña', 'warning');
        return;
    }
    if (!content) {
        showAlert('Por favor, escribe tu reseña', 'warning');
        return;
    }
    if (rating === 0) {
        showAlert('Por favor, selecciona una calificación', 'warning');
        return;
    }
    
    const userId = localStorage.getItem('userId');
    const modal = document.getElementById('createReviewModalOverlay');
    const editReviewId = modal ? modal.getAttribute('data-edit-review-id') : null;
    const isEdit = !!editReviewId;
    
    if (isEdit) {
        // --- Lógica de Edición ---
        console.log('✏️ Modo edición detectado. ReviewId:', editReviewId);
        try {
            const reviewData = {
                UserId: String(userId).trim(),
                Rating: rating,
                Title: title,
                Content: content
            };
            
            await updateReview(editReviewId, reviewData, authToken);
            
            // ============================================================
            // === NUEVO: SINCRONIZACIÓN DE PROMEDIO AL EDITAR ===
            // ============================================================
            if (state.currentReviewData && state.currentReviewData.id) {
                try {
                    console.log("🔄 (Edición) Recalculando promedio para actualizar Content...");
                    
                    const spotifyId = state.currentReviewData.id;
                    const type = state.currentReviewData.type;
                    let contentGuid = null;

                    // 1. Necesitamos el GUID interno para pedir el promedio a Social
                    if (type === 'song') {
                        const songData = await getOrCreateSong(spotifyId); 
                        contentGuid = songData.songId || songData.SongId;
                    } else {
                        const albumData = await getOrCreateAlbum(spotifyId);
                        contentGuid = albumData.albumId || albumData.AlbumId;
                    }

                    // 2. Pedir el nuevo promedio a Social
                    if (contentGuid) {
                        const rawAverage = await getAverageRating(contentGuid, type);
                        const newAverage = parseInt(rawAverage);
                        
                        console.log(`⭐ (Edición) Nuevo promedio calculado: ${newAverage}`);

                        // 3. Actualizar Content Service
                        if (newAverage > 0) {
                            if (type === 'song') {
                                await updateSongRating(spotifyId, newAverage);
                            } else {
                                await updateAlbumRating(spotifyId, newAverage);
                            }
                            console.log("✅ (Edición) Calificación actualizada en Content Service.");
                        }
                    }
                } catch (syncError) {
                    console.warn("⚠️ Advertencia: La reseña se editó, pero hubo un error al sincronizar la calificación:", syncError);
                }
            }

            console.log('✅ Reseña editada exitosamente');
            
            // Recargar las reseñas si hay una función disponible
            if (state && state.loadReviews && typeof state.loadReviews === 'function') {
                await state.loadReviews();
            } else if (typeof window.loadReviews === 'function') {
                await window.loadReviews();
            }
            showAlert('✅ Reseña editada exitosamente', 'success');
            hideCreateReviewModal(state);
            if (modal) modal.removeAttribute('data-edit-review-id');
            if (state.loadReviews && typeof state.loadReviews === 'function') {
                await state.loadReviews();
            }
        } catch (error) {
            console.error('❌ Error editando reseña:', error);
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || error.response.data?.Message || 'Error desconocido';
                if (status === 401) {
                    showAlert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'warning');
                    setTimeout(() => { window.location.href = 'login.html'; }, 2000);
                } else if (status === 403) {
                    showAlert('No tienes permisos para editar esta reseña.', 'danger');
                } else if (status === 404) {
                    showAlert('La reseña no fue encontrada.', 'danger');
                } else {
                    showAlert(`Error al editar la reseña: ${message}`, 'danger');
                }
            } else {
                showAlert('Error al editar la reseña. Intenta nuevamente.', 'danger');
            }
        }
        return;
    }
    
    // --- Lógica de Creación ---
    try {
        if (!state.currentReviewData || !state.currentReviewData.id) {
            console.error('❌ currentReviewData inválido:', state.currentReviewData);
            showAlert('Error: No se seleccionó contenido.', 'warning');
            return;
        }
        
        let contentGuid = null;
        
        try {
            if (state.currentReviewData.type === 'song') {
                const songData = await getOrCreateSong(state.currentReviewData.id); 
                contentGuid = songData.songId || songData.SongId;
            } else if (state.currentReviewData.type === 'album') {
                const albumData = await getOrCreateAlbum(state.currentReviewData.id);
                contentGuid = albumData.albumId || albumData.AlbumId;
            }
        } catch (error) {
            console.error('❌ Error obteniendo Guid del Content Service:', error);
            showAlert(`Error al obtener el ID del contenido: ${error.message}.`, 'danger');
            return;
        }
        
        if (!contentGuid) {
            showAlert('Error: No se pudo obtener el ID del contenido (GUID).', 'warning');
            return;
        }
        
        const reviewData = {
            UserId: String(userId).trim(),
            Rating: rating,
            Title: title,
            Content: content,
            SongId: null,
            AlbumId: null
        };
        
        if (state.currentReviewData.type === 'song') {
            reviewData.SongId = String(contentGuid).trim();
        } else if (state.currentReviewData.type === 'album') {
            reviewData.AlbumId = String(contentGuid).trim();
        }
        
        const response = await createReview(reviewData, authToken);
        
        // === NUEVO CÓDIGO: ACTUALIZACIÓN DE PROMEDIO ===
        // === LÓGICA DE SINCRONIZACIÓN ===
        try {
            console.log("🔄 1. Iniciando cálculo de promedio...");
            
            // A. Pedir promedio a Social
            // IMPORTANTE: contentGuid es el ID interno (Guid)
            const rawAverage = await getAverageRating(contentGuid, state.currentReviewData.type);
            
            // Aseguramos que sea un entero
            const newAverage = parseInt(rawAverage); 
            
            console.log(`⭐ 2. Promedio recibido de Social: ${rawAverage} -> Convertido: ${newAverage}`);

            if (newAverage > 0) {
                // B. Enviar a Content
                const spotifyId = state.currentReviewData.id; // ID de Spotify (String corto)
                console.log(`📤 3. Enviando PATCH a Content. ID: ${spotifyId}, Rating: ${newAverage}`);

                if (state.currentReviewData.type === 'song') {
                    await updateSongRating(spotifyId, newAverage);
                } else {
                    await updateAlbumRating(spotifyId, newAverage);
                }
                console.log("✅ 4. Content Service actualizado con éxito.");
            } else {
                console.warn("⚠️ El promedio calculado fue 0, no se actualizó Content.");
            }
        } catch (syncError) {
            console.error("❌ Error en la sincronización de calificación:", syncError);
        }
        
        let reviewId = response?.ReviewId || response?.reviewId || response?.Id_Review || response?.id || 'N/A';
        if (reviewId !== 'N/A') reviewId = String(reviewId).trim();
        
        console.log('✅ Reseña guardada exitosamente. ID:', reviewId);
        
        if (reviewId !== 'N/A' && state.currentReviewData) {
            const storageKey = `review_content_${reviewId}`;
            localStorage.setItem(storageKey, JSON.stringify(state.currentReviewData));
            console.log(`💾 Datos del contenido guardados en localStorage: ${storageKey}`);
        }
        
        showAlert('✅ Reseña creada y guardada exitosamente', 'success');
        hideCreateReviewModal(state);
        
        setReviewFilter('recent', () => {}, state.loadReviews);
        if (typeof window.reloadCarousel === 'function') {
            window.reloadCarousel();
        }
        
        setTimeout(() => showAlert('Tu reseña ya está visible en la lista', 'info'), 500);
        
    } catch (error) {
        console.error('❌ Error creando reseña:', error);
        if (error.response?.status === 409) {
            showAlert(`Ya creaste una reseña de este contenido.`, 'warning');
            hideCreateReviewModal(state);
        } else {
            showAlert('Error al crear la reseña. Intenta nuevamente.', 'danger');
        }
    }
}

/**
 * Muestra el modal de editar reseña
 */
export async function showEditReviewModal(reviewId, title, content, rating, state) {
    const modal = document.getElementById('createReviewModalOverlay');
    if (!modal) {
        console.error('Modal de crear reseña no encontrado');
        return;
    }
    
    modal.setAttribute('data-edit-review-id', reviewId);
    
    const normalizedReviewId = String(reviewId).trim();
    const storageKey = `review_content_${normalizedReviewId}`;
    const storedContentData = localStorage.getItem(storageKey);
    
    console.log(`🔍 Cargando datos del contenido para edición (reviewId: ${reviewId})`);
    
    if (storedContentData) {
        try {
            const contentData = JSON.parse(storedContentData);
            
            state.currentReviewData = {
                type: contentData.type,
                id: contentData.id,
                name: contentData.name || '',
                artist: contentData.artist || '',
                image: contentData.image || '../Assets/default-avatar.png'
            };
            
            const contentInfoImage = document.getElementById('contentInfoImage');
            const contentInfoName = document.getElementById('contentInfoName');
            const contentInfoType = document.getElementById('contentInfoType');
            
            if (contentInfoImage) {
                contentInfoImage.src = state.currentReviewData.image;
                contentInfoImage.onerror = function() { this.src = '../Assets/default-avatar.png'; };
            }
            if (contentInfoName) contentInfoName.textContent = state.currentReviewData.name;
            if (contentInfoType) contentInfoType.textContent = state.currentReviewData.type === 'song' ? 'CANCIÓN' : 'ÁLBUM';
            
        } catch (e) {
            console.error('❌ Error parseando datos del contenido guardados:', e);
            showAlert('No se pudieron cargar los datos del contenido.', 'warning');
        }
    } else {
        console.warn(`⚠️ No se encontraron datos del contenido en localStorage para review ${reviewId}`);
        showAlert('No se encontraron los datos del contenido. La reseña se puede editar pero no se mostrará la info.', 'warning');
    }
    
    // Llenar los campos con los datos actuales
    const titleInput = document.getElementById('createReviewTitleInput');
    const textInput = document.getElementById('createReviewTextInput');
    const starsContainer = document.getElementById('createReviewStars');
    
    if (titleInput) titleInput.value = title;
    if (textInput) textInput.value = content;
    
    if (starsContainer) {
        const stars = starsContainer.querySelectorAll('.star-input');
        stars.forEach((star) => {
            const starRating = parseInt(star.getAttribute('data-rating'));
            star.classList.toggle('active', starRating <= rating);
        });
    }
    
    const modalTitle = modal.querySelector('.create-review-title');
    if (modalTitle) modalTitle.textContent = 'Editar Reseña';
    
    const contentSelector = document.getElementById('createReviewContentSelector');
    const contentInfo = document.getElementById('createReviewContentInfo');
    
    if (contentSelector) contentSelector.style.display = 'none';
    if (contentInfo) contentInfo.style.display = 'block';
    
    // Asegurar que el modal se muestre
    modal.style.display = 'flex';
    
    console.log('✅ Modal de edición abierto correctamente');
}

