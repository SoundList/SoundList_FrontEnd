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
const tipoBtn = document.getElementById('tipoFilterBtn');
const anoBtn = document.getElementById('anoFilterBtn');
const tipoDropdown = document.getElementById('tipoFilterDropdown');
const anoDropdown = document.getElementById('anoFilterDropdown');

/**
 * Función principal. 
 * ESTRATEGIA: Pedimos siempre los más reseñados al backend para asegurar que nos traiga todo,
 * y luego ordenamos por rating en el frontend.
 */
async function loadRankings() {
    console.log("Cargando rankings con el estado:", currentState);
    showLoading(); 
    updateTitlesAndTags();

    try {
        // 1. TRUCO: Siempre pedimos 'masResenados' al backend.
        // ¿Por qué? Porque si pedimos 'mejores' y el backend tiene la calificacion en 0, no nos devuelve el item.
        // Al pedir 'masResenados', nos aseguramos de recibir los items que tienen actividad, y nosotros arreglamos el rating aquí.
        const fetchState = { ...currentState, categoria: 'masResenados' };
        
        // Obtener ítems de Content Service
        let items = await fetchRankings(fetchState);

        // 2. Obtener TODAS las reseñas del Social Service (Datos frescos)
        const allReviews = await getAllReviews();
        
        const isSong = currentState.tipo === 'canciones';

        // 3. Calcular CONTEO y PROMEDIO en tiempo real
        const statsMap = {}; 
        
        allReviews.forEach(review => {
            // Normalización agresiva de IDs
            let id = isSong ? (review.songId || review.SongId) : (review.albumId || review.AlbumId);
            const rating = Number(review.rating || review.Rating || 0);
            
            if (id) {
                const cleanId = String(id).trim().toLowerCase();
                if (!statsMap[cleanId]) {
                    statsMap[cleanId] = { count: 0, totalRating: 0 };
                }
                statsMap[cleanId].count += 1;
                statsMap[cleanId].totalRating += rating;
            }
        });

        // 4. Enriquecer los ítems con los datos calculados
        let rankedItems = items
            .map(item => {
                const localId = item.songId || item.albumId || item.id; 
                const cleanId = String(localId).trim().toLowerCase();
                
                const stats = statsMap[cleanId] || { count: 0, totalRating: 0 };
                
                // Pisar datos del backend con los reales calculados
                item.reviewCount = stats.count;
                
                if (stats.count > 0) {
                    item.calification = stats.totalRating / stats.count; 
                } else {
                    // Si no tiene reviews en el social, confiamos en lo que diga el content o 0
                    // Pero generalmente será 0 si stats.count es 0
                    item.calification = 0;
                }

                return item;
            })
            // 5. FILTRADO: Solo mostrar items con reseñas
            .filter(item => item.reviewCount > 0); 
            
        // -----------------------------------------------------------------
        // 6. ORDENAMIENTO FRONTEND (Aquí aplicamos lo que el usuario pidió)
        // -----------------------------------------------------------------
        if (currentState.categoria === 'masResenados') {
            // Usuario pidió: MÁS RESEÑADOS
            rankedItems.sort((a, b) => b.reviewCount - a.reviewCount);
            
        } else if (currentState.categoria === 'peores') {
            // Usuario pidió: MENOS RATING
            rankedItems.sort((a, b) => {
                // Si el rating es igual, desempatar por cantidad de reviews
                if (a.calification !== b.calification) return a.calification - b.calification;
                return b.reviewCount - a.reviewCount;
            });
            
        } else {
            // Usuario pidió: MAS RATING (Default 'mejores')
            rankedItems.sort((a, b) => {
                if (b.calification !== a.calification) return b.calification - a.calification;
                return b.reviewCount - a.reviewCount;
            });
        }

        renderRankingList(rankedItems, currentState.tipo);
    } catch (error) {
        console.error("Error al cargar rankings:", error);
        showEmptyState();
    }
}

/**
 * Actualiza el H2 y los tags de filtro
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

function initializeDropdown(button, dropdown) {
    button.addEventListener('click', (e) => {
        e.stopPropagation(); 
        if (dropdown === tipoDropdown) anoDropdown.style.display = 'none';
        else tipoDropdown.style.display = 'none';
        
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });
}

function populateYearDropdown() {
    const currentYear = new Date().getFullYear();
    const yearLimit = 40; 
    let yearsHTML = `<a href="#" class="filter-dropdown-item" data-value="null">TODOS (Año)</a>`;
    
    for (let i = 0; i < yearLimit; i++) {
        const year = currentYear - i;
        yearsHTML += `<a href="#" class="filter-dropdown-item" data-value="${year}">${year}</a>`;
    }
    
    anoDropdown.innerHTML = yearsHTML;

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

            anoDropdown.style.display = 'none'; 
            loadRankings(); 
        });
    });
}

export function initializeRankingHandlers() {
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            const buttonText = button.textContent.trim().toUpperCase();
            if (buttonText === 'MENOS RATING') {
                currentState.categoria = 'peores';
            } else if (buttonText.includes('RESEÑADOS') || buttonText.includes('RESENADOS')) {
                currentState.categoria = 'masResenados';
            } else {
                currentState.categoria = 'mejores';
            }
            
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            loadRankings();
        });
    });

    initializeDropdown(tipoBtn, tipoDropdown);
    initializeDropdown(anoBtn, anoDropdown);

    tipoDropdown.querySelectorAll('.filter-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const value = e.target.getAttribute('data-value'); 
            currentState.tipo = value;
            tipoBtn.innerHTML = `${e.target.textContent.toUpperCase()} <i class="fas fa-chevron-down"></i>`;
            tipoDropdown.style.display = 'none'; 
            loadRankings(); 
        });
    });

    populateYearDropdown(); 

    document.addEventListener('click', (e) => {
        if (!tipoBtn.contains(e.target) && !tipoDropdown.contains(e.target)) tipoDropdown.style.display = 'none';
        if (!anoBtn.contains(e.target) && !anoDropdown.contains(e.target)) anoDropdown.style.display = 'none';
    });
    
    loadRankings();
}