
import { initializeCarousel } from '../Components/carousel/carouselManager.js';
import { renderStars, showAlert,enrichReviewsWithSocialStatus} from '../Utils/reviewHelpers.js';
import { initializeReviews } from '../Components/reviews/reviewFeed.js';
import { setReviewFilter } from '../Components/reviews/reviewUtils.js';
import { initializeCreateReviewModal, showCreateReviewModal, showEditReviewModal } from '../Components/modals/createReviewModal.js';
import { initializeCommentsModalLogic, showCommentsModal } from '../Components/modals/commentsModal.js';
import { initializeReviewDetailModalLogic, showReviewDetailModal } from '../Components/modals/reviewDetailModal.js';
import { initializeDeleteModalsLogic, showDeleteReviewModal } from '../Components/modals/deleteModals.js';

// --- 2. VARIABLES GLOBALES (ESPECÍFICAS DEL HOME) ---
let currentReviewFilter = 'popular'; // Filtro actual de reseñas: 'popular' o 'recent'
let loadReviews = null; // Función para cargar reseñas (se asignará en initializeReviews)
let commentsData = {}; // Array para almacenar comentarios simulados (key: reviewId)

// Estado compartido para los modals
const modalsState = {
    currentReviewData: null, // Almacena datos del contenido para el modal "Crear Reseña"
    editingCommentId: null,
    originalCommentText: null,
    deletingReviewId: null,
    deletingCommentId: null,
    commentsData: commentsData,
    loadReviews: null // Se asignará después
};


// --- 3. PUNTO DE ENTRADA (LLAMADO POR MAIN.JS) ---

export function initializeHomePage() {
    console.log("Inicializando lógica de Home...");
    
    if (document.getElementById('carouselWrapper')) {
        initializeCarousel();
    }
    if (document.getElementById('reviewsList')) {
        initializeReviews(
            commentsData,
            (fn) => { 
                loadReviews = fn;
                modalsState.loadReviews = fn;
            },
            () => currentReviewFilter,
            (filter) => { currentReviewFilter = filter; },
            enrichReviewsWithSocialStatus
        );
        
        // Inicializar modals con el estado compartido
        initializeCreateReviewModal(modalsState); 
        initializeCommentsModalLogic(modalsState);
        initializeReviewDetailModalLogic(modalsState);
        initializeDeleteModalsLogic(modalsState);
    }
    
    // Hacer showCreateReviewModal disponible globalmente para que el headerHandler pueda usarla
    if (typeof window !== 'undefined') {
        window.showCreateReviewModal = (contentData = null) => showCreateReviewModal(contentData, modalsState);
        window.showEditReviewModal = (reviewId, title, content, rating) => showEditReviewModal(reviewId, title, content, rating, modalsState);
        window.showCommentsModal = (reviewId) => showCommentsModal(reviewId, modalsState);
        window.showReviewDetailModal = (reviewId) => showReviewDetailModal(reviewId, modalsState);
        window.showDeleteReviewModal = (reviewId, reviewTitle) => showDeleteReviewModal(reviewId, reviewTitle, modalsState);
    }
}


// --- 4. FUNCIONES GLOBALES DEL HOME (FILTRO Y ESTRELLAS) ---
// setReviewFilter ahora se importa de Components/reviews/reviewUtils.js
// renderStars ahora se importa de Utils/reviewHelpers.js

// --- 5. LÓGICA DEL CARRUSEL ---
// initializeCarousel ahora se importa de Components/carousel/carouselManager.js

// --- 6. LÓGICA DEL FEED DE RESEÑAS ---
// initializeReviews ahora se importa de Components/reviews/reviewFeed.js

// --- 7. LÓGICA DE MODALS ---
// Todos los modals ahora se importan de Components/modals/

// --- 8. FUNCIONES DE UTILIDAD (Alerts) ---
// showAlert ahora se importa de Utils/reviewHelpers.js
