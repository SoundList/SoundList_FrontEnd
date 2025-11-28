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
    if (!state) {
        console.error('showDeleteCommentModal: state no está definido');
        return;
    }
    state.deletingCommentId = commentId;
    const modal = document.getElementById('deleteCommentModalOverlay');
    if(modal) {
        // Guardar el reviewId en el modal si está disponible en el state
        if (state.currentReviewId) {
            modal.setAttribute('data-review-id', state.currentReviewId);
        } else {
            // Intentar obtenerlo del modal de comentarios si está abierto
            const commentsModal = document.getElementById('commentsModalOverlay');
            if (commentsModal && commentsModal.style.display === 'flex') {
                const reviewId = commentsModal.getAttribute('data-review-id');
                if (reviewId) {
                    modal.setAttribute('data-review-id', reviewId);
                    state.currentReviewId = reviewId;
                }
            }
        }
        modal.style.display = 'flex';
        // Asegurar que el modal tenga el z-index más alto
        modal.style.zIndex = '10005';
    } else {
        console.error('Modal de eliminar comentario no encontrado');
    }
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
    console.log('confirmDeleteComment llamado con state:', state);
    if (!state || !state.deletingCommentId) {
        console.error('confirmDeleteComment: state o deletingCommentId no está definido', { state, deletingCommentId: state?.deletingCommentId });
        return;
    }
    
    const commentId = state.deletingCommentId;
    console.log('Eliminando comentario:', commentId);
    
    // Obtener reviewId desde diferentes modales posibles
    let reviewId = null;
    const commentsModal = document.getElementById('commentsModalOverlay');
    const reviewDetailModal = document.getElementById('reviewDetailModalOverlay');
    const deleteCommentModal = document.getElementById('deleteCommentModalOverlay');
    
    // Primero intentar obtener del state si está disponible
    if (state && state.currentReviewId) {
        reviewId = state.currentReviewId;
        console.log('reviewId obtenido del state:', reviewId);
    } else if (commentsModal && commentsModal.style.display === 'flex') {
        reviewId = commentsModal.getAttribute('data-review-id');
        console.log('reviewId obtenido del commentsModal:', reviewId);
    } else if (reviewDetailModal && reviewDetailModal.style.display === 'flex') {
        reviewId = reviewDetailModal.getAttribute('data-review-id');
        console.log('reviewId obtenido del reviewDetailModal:', reviewId);
    } else if (deleteCommentModal) {
        reviewId = deleteCommentModal.getAttribute('data-review-id');
        console.log('reviewId obtenido del deleteCommentModal:', reviewId);
    }
    
    if (!reviewId) {
        console.error('No se pudo obtener reviewId para eliminar comentario');
        showAlert('Error: No se pudo identificar la reseña', 'danger');
        hideDeleteCommentModal(state);
        return;
    }
    
    try {
        console.log('Llamando a deleteComment con commentId:', commentId);
        await deleteComment(commentId);
        console.log('Comentario eliminado exitosamente');
        
        hideDeleteCommentModal(state);
        
        // Obtener la cantidad actualizada de comentarios
        const comments = await getCommentsByReview(reviewId);
        const newCommentsCount = comments.length;
        
        // Actualizar contador en el botón de comentarios de la reseña (siempre, no solo si el modal está abierto)
        // Buscar en todas las páginas (home, perfil, canciones, álbum)
        const commentBtns = document.querySelectorAll(`.comment-btn[data-review-id="${reviewId}"]`);
        commentBtns.forEach(commentBtn => {
            const countSpan = commentBtn.querySelector('.review-comments-count');
            if (countSpan) {
                countSpan.textContent = newCommentsCount;
            } else {
                // Fallback: buscar cualquier span dentro del botón
                const span = commentBtn.querySelector('span');
                if (span) {
                    span.textContent = newCommentsCount;
                }
            }
        });
        
        // Recargar comentarios en el modal de comentarios si está abierto
        if (commentsModal && commentsModal.style.display === 'flex') {
            const { loadCommentsIntoModal } = await import('./commentsModal.js');
            await loadCommentsIntoModal(reviewId, state);
        }
        
        // Actualizar vista detallada si está abierta
        if (reviewDetailModal && reviewDetailModal.style.display === 'flex') {
            const { loadReviewDetailComments } = await import('./reviewDetailModal.js');
            await loadReviewDetailComments(reviewId, comments, state);
            const commentsCount = document.getElementById('reviewDetailCommentsCount');
            if (commentsCount) commentsCount.textContent = newCommentsCount;
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
        
        showAlert('Reseña eliminada exitosamente', 'success');
        
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

