
import { fetchRankings } from '../APIs/rankingAPI.js';
import { getAllReviews } from '../APIs/socialApi.js';
import { 
    renderRankingList, 
    showLoading, 
    showEmptyState, 
    updateRankingTitle,
    updateActiveFiltersTags
} from '../Components/rankingCard.js';

// --- ESTADO DE LA PÁGINA ---
let currentState = {
    tipo: 'canciones',   
    categoria: 'mejores', 
    ano: null           
};

// --- SELECTORES DE ELEMENTOS ---
const categoryButtons = document.querySelectorAll('.filter-category-btn');
// Botones de los menús
const tipoBtn = document.getElementById('tipoFilterBtn');
const anoBtn = document.getElementById('anoFilterBtn');
// Menús desplegables
const tipoDropdown = document.getElementById('tipoFilterDropdown');
const anoDropdown = document.getElementById('anoFilterDropdown');

/**
 * Función principal. Llama a la API, cuenta reseñas y renderiza.
 */
/**
 * Función principal. Llama a la API, cuenta reseñas y renderiza.
 */
async function loadRankings() {
    console.log("Cargando rankings con el estado:", currentState);
    showLoading(); 
    updateTitlesAndTags();

    // Eliminamos el alert de 'masResenados' y dejamos que el flujo continúe.
    // El filtro 'masResenados' no envía el parámetro 'orden' al backend, 
    // por lo que nos dará la lista sin ordenar por calificación.

    try {
        // 1. Obtener ítems de Content
        let items = await fetchRankings(currentState);

        // 2. Obtener TODAS las reseñas del Social Service
        const allReviews = await getAllReviews();
        const itemTypeKey = currentState.tipo === 'canciones' ? 'songId' : 'albumId';

        // 3. Contar las reseñas por ID local (GUID)
        const reviewSummary = {}; // { GUID_Local: count }
        allReviews.forEach(review => {
            const id = review[itemTypeKey] || review[itemTypeKey.charAt(0).toUpperCase() + itemTypeKey.slice(1)];
            if (id) {
                reviewSummary[id] = (reviewSummary[id] || 0) + 1;
            }
        });

        // 4. Enriquecer los ítems con el conteo de reseñas
        let rankedItems = items
            .map(item => {
                const localId = item.songId || item.albumId; // GUID local
                item.reviewCount = reviewSummary[localId] || 0;
                return item;
            })
            // 5. FILTRADO ESTRICTO: Solo ítems que tienen al menos una reseña (reviewCount > 0)
            .filter(item => item.reviewCount > 0); 
            
        // -----------------------------------------------------------------
        // 6. NUEVO: Lógica de Ordenamiento por Conteo de Reseñas (JS Sort)
        // -----------------------------------------------------------------
        if (currentState.categoria === 'masResenados') {
            // Ordenamos de mayor a menor reviewCount
            rankedItems.sort((a, b) => b.reviewCount - a.reviewCount);
        }
        // Si no es 'masResenados', la lista ya viene ordenada por el ContentAPI (por Calificación)

        renderRankingList(rankedItems, currentState.tipo);
    } catch (error) {
        console.error("Error al cargar rankings:", error);
        showEmptyState();
    }
}
/**
 * Actualiza el H2 y los tags de filtro (ej. "TODOS – CANCIONES")
 */
function updateTitlesAndTags() {
    const tipoTexto = currentState.tipo === 'canciones' ? 'CANCIONES' : 'ÁLBUMES';
    let categoriaTexto = 'CON MÁS RATING';
    
    if (currentState.categoria === 'peores') {
        categoriaTexto = 'CON MENOS RATING';
    } else if (currentState.categoria === 'masResenados') {
        categoriaTexto = 'MÁS RESEÑADAS';
    }

    const anoTexto = currentState.ano || 'TODOS';

    updateRankingTitle(`${tipoTexto} ${categoriaTexto}`);
    updateActiveFiltersTags(`${anoTexto} – ${tipoTexto}`);
}

/**
 * Función genérica para inicializar un menú desplegable.
 * Se encarga de abrir/cerrar y cerrar al hacer clic fuera.
 */
function initializeDropdown(button, dropdown) {
    button.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita que el clic se propague al 'document'
        // Cierra otros menús que estén abiertos
        if (dropdown === tipoDropdown) {
            anoDropdown.style.display = 'none';
        } else {
            tipoDropdown.style.display = 'none';
        }
        // Muestra u oculta el menú actual
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });
}

/**
 * Genera dinámicamente la lista de años para el dropdown.
 */
function populateYearDropdown() {
    const currentYear = new Date().getFullYear();
    
    // CAMBIO: Definimos el límite de años a generar (Ejemplo: 40 años atrás)
    const yearLimit = 40; 
    
    let yearsHTML = `<a href="#" class="filter-dropdown-item" data-value="null">TODOS (Año)</a>`;
    
    // Genera los últimos 40 años
    for (let i = 0; i < yearLimit; i++) {
        const year = currentYear - i;
        yearsHTML += `<a href="#" class="filter-dropdown-item" data-value="${year}">${year}</a>`;
    }
    
    anoDropdown.innerHTML = yearsHTML;

    // Añade listeners a los nuevos items de año
    anoDropdown.querySelectorAll('.filter-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const value = e.target.getAttribute('data-value');
            
            if (value === 'null') {
                currentState.ano = null;
                anoBtn.innerHTML = 'AÑO <i class="fas fa-chevron-down"></i>';
            } else {
                currentState.ano = value;
                anoBtn.innerHTML = `${value} <i class="fas fa-chevron-down"></i>`;
            }

            anoDropdown.style.display = 'none'; // Cierra el menú
            loadRankings(); // Recarga
        });
    });
}


/**
 * Inicializa todos los event listeners de la página.
 */
export function initializeRankingHandlers() {
    
    // --- FILTROS DE CATEGORÍA (Sidebar) ---
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            const buttonText = button.textContent.trim().toUpperCase();
            if (buttonText === 'MENOS RATING') {
                currentState.categoria = 'peores';
            } else if (buttonText === 'MAS RESEÑADOS') {
                currentState.categoria = 'masResenados';
            } else {
                currentState.categoria = 'mejores';
            }
            
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            loadRankings();
        });
    });

    // --- INICIALIZA LOS NUEVOS DROPDOWNS ---
    initializeDropdown(tipoBtn, tipoDropdown);
    initializeDropdown(anoBtn, anoDropdown);

    // --- LÓGICA PARA EL DROPDOWN DE TIPO ---
    tipoDropdown.querySelectorAll('.filter-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const value = e.target.getAttribute('data-value'); // 'canciones' o 'albumes'
            currentState.tipo = value;
            
            // Actualiza el texto del botón
            tipoBtn.innerHTML = `${e.target.textContent.toUpperCase()} <i class="fas fa-chevron-down"></i>`;
            
            tipoDropdown.style.display = 'none'; // Cierra el menú
            loadRankings(); // Recarga
        });
    });

    populateYearDropdown(); // Crea los items de año (2025, 2024, etc.)

    document.addEventListener('click', (e) => {
        if (!tipoBtn.contains(e.target) && !tipoDropdown.contains(e.target)) {
            tipoDropdown.style.display = 'none';
        }
        if (!anoBtn.contains(e.target) && !anoDropdown.contains(e.target)) {
            anoDropdown.style.display = 'none';
        }
    });
    loadRankings();
}