/**
 * ReactionApi - Wrapper para exponer funciones de reacciones (likes) globalmente
 * Este módulo expone las funciones de socialApi como window.reactionApi
 * para que likesHandler.js pueda usarlas.
 */

import * as socialApi from './socialApi.js';

// Exponer las funciones de reacciones como window.reactionApi
if (typeof window !== 'undefined') {
    window.reactionApi = {
        addReviewReaction: socialApi.addReviewReaction,
        removeReviewReaction: socialApi.deleteReviewReaction,
        addCommentReaction: socialApi.addCommentReaction,
        removeCommentReaction: socialApi.deleteCommentReaction,
        getReviewReactionCount: socialApi.getReviewReactionCount,
        getUserReactionToReview: socialApi.getUserReactionToReview
    };
}
