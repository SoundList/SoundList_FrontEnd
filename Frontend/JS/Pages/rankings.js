import { initializeRankingHandlers } from '../Handlers/rankingHandler.js';
import { initializeHeader } from '../Handlers/headerHandler.js';

document.addEventListener('DOMContentLoaded', function() {
    
    // Inicializar el header (navegación, perfil, notificaciones, etc.)
    initializeHeader();
    
    // Inicia toda la lógica de la página de rankings
    initializeRankingHandlers();

});