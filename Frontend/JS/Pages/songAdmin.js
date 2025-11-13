// --- IMPORTACIONES ---
import {
    getSongByApiId,
    getSongReviewsByLocalId,
    createSongReview
} from './../APIs/songApi.js';
import { createStarRating, createReviewCard } from './../Components/renderAlbum.js'; // Reutilizamos
import { initializeTabNavigation } from './../Handlers/albumHandler.js'; // Reutilizamos

// --- ESTADO GLOBAL ---
let currentRating = 0;
let currentSongData = null; // Almacenará los datos de la canción

// --- INICIO ---
document.addEventListener('DOMContentLoaded', () => {
    initializeTabNavigation();
    initializeCreateReviewModal();
    loadPageData();
});

// --- FUNCIONES PRINCIPALES ---

async function loadPageData() {
    const loadingEl = document.getElementById('loadingSpinner');
    const contentEl = document.getElementById('songContent');

    try {
        const params = new URLSearchParams(window.location.search);
        const apiSongId = params.get('id');
        if (!apiSongId) throw new Error("No se proporcionó un ID de canción.");

        contentEl.style.display = 'none';
        loadingEl.style.display = 'block';

        // 1. Obtener datos principales (para header, detalles y ID local)
        const songData = await getSongByApiId(apiSongId);
        currentSongData = songData; // Guardamos globalmente

        // 2. Renderizar header y detalles
        renderSongHeader(songData);
        renderSongDetails(songData);

        // 3. Obtener reseñas
        const reviewsData = await getSongReviewsByLocalId(songData.songId); // Usamos Guid local

        // 4. Renderizar reseñas
        renderReviews(reviewsData);

        contentEl.style.display = 'block';
    } catch (error) {
        console.error("Error fatal al cargar página de canción:", error);
        contentEl.innerHTML = `<h2 class="text-light text-center py-5">Error al cargar la canción: ${error.message}</h2>`;
        contentEl.style.display = 'block';
    } finally {
        loadingEl.style.display = 'none';
    }
}

// --- FUNCIONES DE RENDERIZADO ---

function renderSongHeader(song) {
    document.getElementById('songCover').src = song.image || 'https://via.placeholder.com/300';
    document.getElementById('songTitle').textContent = song.title;
    
    const artistLink = document.getElementById('songArtistLink');
    artistLink.textContent = song.artistName;
    artistLink.href = `./artists.html?id=${song.apiArtistId}`; // Link real
    
    const albumLink = document.getElementById('songAlbumLink');
    albumLink.textContent = `ÁLBUM: ${song.albumName}`;
    albumLink.href = `./album.html?id=${song.apiAlbumId}`; // Link real

    const rating = song.averageRating || 0;
    const reviewCount = song.reviewCount || 0;
    document.getElementById('ratingNumber').textContent = rating.toFixed(1);
    document.getElementById('ratingStars').innerHTML = createStarRating(rating, true);
    document.getElementById('ratingCount').textContent = `(${reviewCount} reviews)`;
}

function renderSongDetails(song) {
    const releaseDate = new Date(song.releaseDate).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    
    document.getElementById('detailName').textContent = song.title;
    document.getElementById('detailReleaseDate').textContent = releaseDate;
    document.getElementById('detailGenre').textContent = song.genre || '-';

    // Formatear duración (asumiendo que viene como "00:02:58.000")
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
    listEl.innerHTML = reviews.length > 0
        ? reviews.map(createReviewCard).join('')
        : '<p class="text-light text-center">Aún no hay reseñas.</p>';
        
    document.getElementById('aiSummary').style.display = reviews.length > 2 ? 'flex' : 'none';
    document.getElementById('aiSummaryText').textContent = "Los fans destacan la energía de esta canción...";
}

// --- LÓGICA DEL MODAL (CON SUBMIT REAL) ---

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
    if (!currentSongData) return;
    document.getElementById('modalSongCover').src = currentSongData.image || '';
    document.getElementById('modalSongTitle').textContent = currentSongData.title;
    document.getElementById('modalSongArtist').textContent = currentSongData.artistName;
    document.getElementById('reviewTitleInput').value = '';
    document.getElementById('reviewTextInput').value = '';
    setStarRating(0);
    document.getElementById('createReviewModalOverlay').style.display = 'flex';
}

function hideCreateReviewModal() { document.getElementById('createReviewModalOverlay').style.display = 'none'; }
function setStarRating(rating) { currentRating = rating; highlightStars(rating); }
function highlightStars(rating) {
    document.querySelectorAll('#starsRatingInput i').forEach(star => {
        const val = parseInt(star.dataset.value);
        star.className = val <= rating ? 'fas fa-star' : 'far fa-star';
    });
}

async function handleSubmitReview() {
    const reviewTitle = document.getElementById('reviewTitleInput').value;
    const reviewText = document.getElementById('reviewTextInput').value;

    if (!reviewTitle || !reviewText || currentRating === 0) {
        alert('Por favor, completa todos los campos y la calificación.');
        return;
    }
    if (!currentSongData || !currentSongData.songId) {
        alert('Error: No se pudo identificar la canción.');
        return;
    }

    const reviewData = {
        title: reviewTitle,
        comment: reviewText,
        rating: currentRating
    };
    
    const submitBtn = document.getElementById('submitReviewBtn');
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'SUBIENDO...';

        await createSongReview(currentSongData.songId, reviewData);
        
        alert('¡Reseña de canción enviada!');
        hideCreateReviewModal();
        
        // Recargar solo las reseñas
        const reviews = await getSongReviewsByLocalId(currentSongData.songId);
        renderReviews(reviews);

    } catch (error) {
        alert(`Error al enviar reseña: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'SUBIR';
    }
}