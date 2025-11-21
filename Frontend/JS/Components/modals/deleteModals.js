/**
 * Módulo de modals de eliminación
 * Maneja la eliminación de reseñas y comentarios
 */

import { deleteComment, deleteReview } from '../../APIs/socialApi.js';
import { getCommentsByReview } from '../../APIs/socialApi.js';
import { showAlert } from '../../Utils/reviewHelpers.js';
// Importaciones dinámicas para evitar dependencias circulares
// import { loadCommentsIntoModal } from './commentsModal.js';
// import { loadReviewDetailComments } from './reviewDetailModal.js';

/**
 * Inicializa los modals de eliminación
 * @param {Object} state - Objeto con estado compartido (deletingReviewId, deletingCommentId, loadReviews)
 */
export function initializeDeleteModalsLogic(state) {
    // Modal de Borrar Comentario
    const cancelDeleteCommentBtn = document.getElementById('cancelDeleteCommentBtn');
    const confirmDeleteCommentBtn = document.getElementById('confirmDeleteCommentBtn');
    const deleteCommentModalOverlay = document.getElementById('deleteCommentModalOverlay');
    
    if (cancelDeleteCommentBtn) {
        cancelDeleteCommentBtn.addEventListener('click', () => hideDeleteCommentModal(state));
    }
    if (confirmDeleteCommentBtn) {
        confirmDeleteCommentBtn.addEventListener('click', () => confirmDeleteComment(state));
    }
    if (deleteCommentModalOverlay) {
        deleteCommentModalOverlay.addEventListener('click', (e) => {
            if (e.target === deleteCommentModalOverlay) hideDeleteCommentModal(state);
        });
    }
    
    // Modal de Borrar Reseña
    const cancelDeleteReviewBtn = document.getElementById('cancelDeleteReviewBtn');
    const confirmDeleteReviewBtn = document.getElementById('confirmDeleteReviewBtn');
    const deleteReviewModalOverlay = document.getElementById('deleteReviewModalOverlay');
    
    if (cancelDeleteReviewBtn) {
        cancelDeleteReviewBtn.addEventListener('click', () => hideDeleteReviewModal(state));
    }
    if (confirmDeleteReviewBtn) {
        confirmDeleteReviewBtn.addEventListener('click', () => confirmDeleteReview(state));
    }
    if (deleteReviewModalOverlay) {
        deleteReviewModalOverlay.addEventListener('click', (e) => {
            if (e.target === deleteReviewModalOverlay) hideDeleteReviewModal(state);
        });
    }
}

/**
 * Muestra el modal de eliminar comentario
 */
export function showDeleteCommentModal(commentId, state) {
    state.deletingCommentId = commentId;
    const modal = document.getElementById('deleteCommentModalOverlay');
    if(modal) modal.style.display = 'flex';
}
    
/**
 * Oculta el modal de eliminar comentario
 */
function hideDeleteCommentModal(state) {
    const modal = document.getElementById('deleteCommentModalOverlay');
    if(modal) modal.style.display = 'none';
    state.deletingCommentId = null;
}
    
/**
 * Confirma la eliminación de un comentario
 */
async function confirmDeleteComment(state) {
    if (!state.deletingCommentId) return;
    
    // Obtener reviewId desde diferentes modales posibles
    let reviewId = null;
    const commentsModal = document.getElementById('commentsModalOverlay');
    const reviewDetailModal = document.getElementById('reviewDetailModalOverlay');
    const deleteCommentModal = document.getElementById('deleteCommentModalOverlay');
    
    if (commentsModal && commentsModal.style.display === 'flex') {
        reviewId = commentsModal.getAttribute('data-review-id');
    } else if (reviewDetailModal && reviewDetailModal.style.display === 'flex') {
        reviewId = reviewDetailModal.getAttribute('data-review-id');
    } else if (deleteCommentModal) {
        reviewId = deleteCommentModal.getAttribute('data-review-id');
    }
    
    if (!reviewId) {
        console.error('No se pudo obtener reviewId para eliminar comentario');
        showAlert('Error: No se pudo identificar la reseña', 'danger');
        hideDeleteCommentModal(state);
        return;
    }
    
    const authToken = localStorage.getItem('authToken');
    
    try {
        await deleteComment(state.deletingCommentId, authToken);
        
        hideDeleteCommentModal(state);
        
        // Recargar comentarios en el modal de comentarios si está abierto
        if (commentsModal && commentsModal.style.display === 'flex') {
            const { loadCommentsIntoModal } = await import('./commentsModal.js');
            await loadCommentsIntoModal(reviewId, state);
        }
        
        // Actualizar vista detallada si está abierta
        if (reviewDetailModal && reviewDetailModal.style.display === 'flex') {
            const { loadReviewDetailComments } = await import('./reviewDetailModal.js');
            const comments = await getCommentsByReview(reviewId);
            await loadReviewDetailComments(reviewId, comments, state);
            const commentsCount = document.getElementById('reviewDetailCommentsCount');
            if (commentsCount) commentsCount.textContent = comments.length;
        }
        
        showAlert('Comentario eliminado exitosamente', 'success');
    } catch (error) {
        console.error('Error eliminando comentario:', error);
        showAlert('Error al eliminar el comentario', 'danger');
        hideDeleteCommentModal(state);
    }
}
    
/**
 * Muestra el modal de eliminar reseña
 */
export function showDeleteReviewModal(reviewId, reviewTitle, state) {
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
    
    state.deletingReviewId = reviewId;
    
    const modal = document.getElementById('deleteReviewModalOverlay');
    const messageElement = document.getElementById('deleteReviewMessage');
    
    if (modal && messageElement) {
        messageElement.textContent = `¿Estás seguro de que quieres eliminar la reseña "${reviewTitle}"? Esta acción no se puede deshacer.`;
        modal.style.display = 'flex';
    } else {
        console.error('❌ Modal de eliminación de reseña no encontrado');
    }
}
    
/**
 * Oculta el modal de eliminar reseña
 */
function hideDeleteReviewModal(state) {
    const modal = document.getElementById('deleteReviewModalOverlay');
    if (modal) modal.style.display = 'none';
    state.deletingReviewId = null;
}
    
/**
 * Confirma la eliminación de una reseña
 */
async function confirmDeleteReview(state) {
    if (!state.deletingReviewId) {
        showAlert('Error: No se pudo identificar la reseña a eliminar', 'danger');
        return;
    }
    
    const reviewIdToDelete = state.deletingReviewId;
    hideDeleteReviewModal(state);
    
    await deleteReviewLogic(reviewIdToDelete, state);
}

/**
 * Lógica de eliminación de reseña
 */
async function deleteReviewLogic(reviewId, state) {
    const userId = localStorage.getItem('userId');
    const authToken = localStorage.getItem('authToken');
    
    if (!userId || !authToken) {
        showAlert('Debes iniciar sesión para eliminar reseñas', 'warning');
        return;
    }
    
    console.log('🗑️ Eliminando reseña:', { reviewId, userId });
    
    try {
        await deleteReview(reviewId, userId, authToken);
        
        showAlert('✅ Reseña eliminada exitosamente', 'success');
        
        if (state.loadReviews && typeof state.loadReviews === 'function') {
            await state.loadReviews();
        }
    } catch (error) {
        console.error('Error eliminando reseña:', error);
        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || error.response.data?.Message || 'Error desconocido';
                
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

