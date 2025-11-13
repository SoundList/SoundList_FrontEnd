// --- IMPORTACIONES ACTUALIZADAS ---
import { 
    getAlbumByApiId, 
    getAlbumSongsByApiId, 
    getAlbumReviewsByLocalId,
    createAlbumReview
} from './../APIs/albumApi.js';
import { createSongListItem, createStarRating, createReviewCard } from './../Components/renderAlbum.js';
import { initializeTabNavigation } from './../Handlers/albumHandler.js';
// (Si tienes un common.js para el header, impórtalo también)

// --- ESTADO GLOBAL DE LA PÁGINA ---
let currentRating = 0;
let currentAlbumData = null; // Almacenará los datos del álbum cargado

// --- INICIO DE LA APLICACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    initializeTabNavigation();
    initializeCreateReviewModal();
    loadPageData(); // Función principal modificada
});

// --- FUNCIONES PRINCIPALES ---

/**
 * Función maestra que carga toda la data de la página DESDE LA API REAL.
 */
async function loadPageData() {
    const loadingEl = document.getElementById('loadingSpinner');
    const contentEl = document.getElementById('albumContent');
    
    try {
        // 1. Obtener el ID de la URL
        const params = new URLSearchParams(window.location.search);
        const apiAlbumId = params.get('id');

        if (!apiAlbumId) {
            throw new Error("No se proporcionó un ID de álbum en la URL.");
        }

        // 2. Mostrar Spinner y ocultar contenido
        contentEl.style.display = 'none';
        loadingEl.style.display = 'block';

        // 3. Obtener datos principales del álbum
        // Esta llamada nos trae los datos del álbum, incluido su Guid local
        const albumData = await getAlbumByApiId(apiAlbumId);
        currentAlbumData = albumData; // Guardamos los datos globalmente

        // 4. Renderizar el header (esto ya lo podemos hacer)
        renderAlbumHeader(albumData);
        
        // 5. Obtener canciones y reseñas en paralelo
        const [songsData, reviewsData] = await Promise.all([
            getAlbumSongsByApiId(albumData.apiAlbumId),
            getAlbumReviewsByLocalId(albumData.albumId) // Usamos el Guid local
        ]);

        // 6. Renderizar el resto del contenido
        renderSongList(songsData);
        renderAlbumDetails(albumData, songsData.length); // Pasamos el total de canciones
        renderReviews(reviewsData);

        // 7. Mostrar contenido, ocultar spinner
        contentEl.style.display = 'block';
        
    } catch (error) {
        console.error("Error fatal al cargar la página:", error);
        contentEl.innerHTML = `<h2 class="text-light text-center py-5">Error al cargar el álbum: ${error.message}</h2>`;
        contentEl.style.display = 'block';
    } finally {
        loadingEl.style.display = 'none';
    }
}

// --- FUNCIONES DE RENDERIZADO (Sin cambios) ---

function renderAlbumHeader(album) {
    document.getElementById('albumCover').src = album.image || './../../Assets/album-de-musica.png';
    document.getElementById('albumTitle').textContent = album.title;
    
    const artistLink = document.getElementById('albumArtistLink');
    artistLink.textContent = album.artistName;
    artistLink.href = `./artists.html?id=${album.apiArtistId}`; // Link real

    // --- Calificación (Idealmente vendría de la API) ---
    const rating = album.averageRating || 0; // Asumimos que la API devuelve esto
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
    document.getElementById('detailGenre').textContent = album.genre || "Urbano"; // Asumimos que viene de la API
}

function renderReviews(reviews) {
    const reviewsListEl = document.getElementById('reviewsList');
    if (!reviews || reviews.length === 0) {
        reviewsListEl.innerHTML = '<p class="text-light text-center">Aún no hay reseñas. ¡Sé el primero!</p>';
        return;
    }
    reviewsListEl.innerHTML = reviews.map(createReviewCard).join('');
    
    // (Lógica del resumen de IA - la dejamos como estaba por ahora)
    if (reviews.length > 2) {
        document.getElementById('aiSummary').style.display = 'flex';
        document.getElementById('aiSummaryText').textContent = "El álbum muestra una clara evolución del artista, combinando ritmos de trap contundentes con letras más introspectivas.";
    }
}

// --- LÓGICA DEL MODAL (CON SUBMIT REAL) ---

function initializeCreateReviewModal() {
    // ... (los mismos listeners que tenías para abrir/cerrar y estrellas) ...
    const btnAgregarResena = document.getElementById('btnAgregarResena');
    const createReviewModalOverlay = document.getElementById('createReviewModalOverlay');
    const closeCreateReviewModal = document.getElementById('closeCreateReviewModal');
    const starsInput = document.getElementById('starsRatingInput');
    const submitReviewBtn = document.getElementById('submitReviewBtn');

    btnAgregarResena.addEventListener('click', showCreateReviewModal);
    closeCreateReviewModal.addEventListener('click', hideCreateReviewModal);
    createReviewModalOverlay.addEventListener('click', (e) => {
        if (e.target === createReviewModalOverlay) hideCreateReviewModal();
    });
    starsInput.addEventListener('click', (e) => {
        if (e.target.tagName === 'I') setStarRating(parseInt(e.target.dataset.value));
    });
    starsInput.addEventListener('mouseover', (e) => {
        if (e.target.tagName === 'I') highlightStars(parseInt(e.target.dataset.value));
    });
    starsInput.addEventListener('mouseout', () => highlightStars(currentRating));

    // --- Listener de SUBMIT actualizado ---
    submitReviewBtn.addEventListener('click', handleSubmitReview);
}

function showCreateReviewModal() {
    if (!currentAlbumData) {
        alert("Error: No se han cargado los datos del álbum.");
        return;
    }
    const modalOverlay = document.getElementById('createReviewModalOverlay');
    document.getElementById('modalAlbumCover').src = currentAlbumData.image || '';
    document.getElementById('modalAlbumTitle').textContent = currentAlbumData.title;
    document.getElementById('modalAlbumArtist').textContent = currentAlbumData.artistName;

    document.getElementById('reviewTitleInput').value = '';
    document.getElementById('reviewTextInput').value = '';
    setStarRating(0);
    currentRating = 0;

    modalOverlay.style.display = 'flex';
}

function hideCreateReviewModal() {
    document.getElementById('createReviewModalOverlay').style.display = 'none';
}

function setStarRating(rating) {
    currentRating = rating;
    highlightStars(rating);
}

function highlightStars(rating) {
    const stars = document.querySelectorAll('#starsRatingInput i');
    stars.forEach(star => {
        const value = parseInt(star.dataset.value);
        if (value <= rating) {
            star.classList.replace('far', 'fas');
        } else {
            star.classList.replace('fas', 'far');
        }
    });
}

/**
 * ¡NUEVO! Maneja el envío de la reseña a la API real.
 */
async function handleSubmitReview() {
    const reviewTitle = document.getElementById('reviewTitleInput').value;
    const reviewText = document.getElementById('reviewTextInput').value;
    const rating = currentRating;

    if (reviewTitle.trim() === '' || reviewText.trim() === '' || rating === 0) {
        alert('Por favor, completa todos los campos y selecciona una calificación.');
        return;
    }

    if (!currentAlbumData || !currentAlbumData.albumId) {
        alert('Error: No se pudo identificar el álbum para enviar la reseña.');
        return;
    }
    
    const reviewData = {
        title: reviewTitle,
        comment: reviewText, // Asegúrate de que coincida con tu DTO (Title, Comment, Rating)
        rating: rating
    };

    try {
        const submitBtn = document.getElementById('submitReviewBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'SUBIENDO...';

        // Usamos el Guid local del álbum
        await createAlbumReview(currentAlbumData.albumId, reviewData);
        
        alert('¡Reseña enviada con éxito!');
        hideCreateReviewModal();
        
        // Volvemos a cargar solo las reseñas para ver la nueva
        const reviewsData = await getAlbumReviewsByLocalId(currentAlbumData.albumId);
        renderReviews(reviewsData);

    } catch (error) {
        console.error("Error al enviar la reseña:", error);
        alert(`Error al enviar la reseña: ${error.message}`);
    } finally {
        const submitBtn = document.getElementById('submitReviewBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'SUBIR';
    }
}