
import { AmigosHandler } from '../Handlers/amigosHandler.js';
import { initializeCreateReviewModal, showEditReviewModal } from '../Components/modals/createReviewModal.js';
import { initializeCommentsModalLogic, showCommentsModal } from '../Components/modals/commentsModal.js';
import { initializeReviewDetailModalLogic, showReviewDetailModal } from '../Components/modals/reviewDetailModal.js';
import { initializeDeleteModalsLogic, showDeleteReviewModal } from '../Components/modals/deleteModals.js';

const modalsState = {
    currentReviewData: null,
    editingCommentId: null,
    originalCommentText: null,
    deletingReviewId: null,
    deletingCommentId: null,
    commentsData: {}, 

    loadReviews: () => {
        const activeFilter = document.querySelector('.filter-btn.active');
        const filterType = activeFilter ? activeFilter.dataset.filter : 'amigos';
        AmigosHandler.loadUserList(filterType);
    }
};

export function initializeAmigosPage() {
    console.log('Iniciando página de Amigos con gestión completa de reseñas...');

    initializeHeader(); 

    AmigosHandler.init();

    initializeCreateReviewModal(modalsState);      
    initializeCommentsModalLogic(modalsState);     
    initializeReviewDetailModalLogic(modalsState); 
    initializeDeleteModalsLogic(modalsState);     

    AmigosHandler.loadUserList('amigos');

    if (typeof window !== 'undefined') {

        window.showEditReviewModal = (reviewId, title, content, rating) => 
            showEditReviewModal(reviewId, title, content, rating, modalsState);

        window.showDeleteReviewModal = (reviewId, reviewTitle) => 
            showDeleteReviewModal(reviewId, reviewTitle, modalsState);

        window.showReviewDetailModal = (reviewId) => 
            showReviewDetailModal(reviewId, modalsState);

        window.showCommentsModal = (reviewId) => 
            showCommentsModal(reviewId, modalsState);
    }
}