
import { fetchRankings } from '../APIs/rankingAPI.js';
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
 * Función principal. Llama a la API y renderiza los resultados.
 */
async function loadRankings() {
    console.log("Cargando rankings con el estado:", currentState);
    showLoading(); 
    updateTitlesAndTags();

    if (currentState.categoria === 'masResenados') {
        alert("El filtro 'MAS RESEÑADOS' no está implementado.\n\nEl 'ContentAPI' no devuelve la cantidad de reseñas.");
        showEmptyState();
        return;
    }
    
    try {
        const items = await fetchRankings(currentState);
        renderRankingList(items, currentState.tipo);
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
    let yearsHTML = `<a href="#" class="filter-dropdown-item" data-value="null">TODOS (Año)</a>`;
    
    // Genera los últimos 10 años
    for (let i = 0; i < 10; i++) {
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