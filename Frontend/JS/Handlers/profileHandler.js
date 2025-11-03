// ================================
// ⚙️ JS/Handlers/profileHandler.js
// (ACTUALIZADO: Con mock de 'user' y API real comentada)
// ================================

/**
 * Función principal para cargar el HEADER del perfil y las RESEÑAS RECIENTES.
 * (El carrusel de destacadas se carga por separado en profile.js).
 */
async function loadUserProfile() {
    console.log("👤 Cargando perfil...");

    // IDs de los contenedores
    const recentContainerId = "recent-reviews"; 
    
    // IDs de los elementos del perfil
    const userAvatarEl = document.querySelector(".profile-avatar");
    const userNameEl = document.querySelector(".username");
    const userQuoteEl = document.querySelector(".user-quote");
    const reviewCountEl = document.getElementById("user-reviews");
    const followingCountEl = document.getElementById("user-following");
    const followerCountEl = document.getElementById("user-followers");
    const defaultAvatar ="../../Assets/default-avatar.png";

    // Poner "Cargando..." en la sección de reseñas recientes
    const recentContainer = document.getElementById(recentContainerId);
    if (recentContainer) recentContainer.innerHTML = "<p class='text-muted'>Cargando reseñas...</p>";

    try {
        // --- 1. Cargar Datos del Usuario (Header y Stats) ---
        
        // 1. (Línea real COMENTADA para cuando la API /profile esté lista)
        // const user = await window.userApi.getUserProfile(); 
        
        // 2. (Líneas de SIMULACIÓN (Mock) activas)
        console.warn("Usando datos de 'user' simulados. La API /profile aún no está conectada.");
        const user = { id: 1, username: "TuUsuarioDePrueba", image: null, quote: "Esta es una bio de prueba." };
        
        const userId = user.id; 

        // (Líneas de SIMULACIÓN (Mock) activas para Follows)
        console.warn("Usando datos de 'Follows' simulados. La API devuelve 400.");
        const followersData = { count: 12 }; // <- Dato de prueba
        const followingData = { count: 5 }; // <- Dato de prueba
        
        console.log("✅ Perfil (simulado), seguidores y seguidos cargados.");

        // Poblar el header del perfil
        if (userAvatarEl) userAvatarEl.src = user.image || defaultAvatar;
        if (userNameEl) userNameEl.textContent = user.username || "Usuario";
        if (userQuoteEl) userQuoteEl.textContent = user.quote || "Sin frase personal";

        // Poblar stats
        if (followerCountEl) followerCountEl.textContent = followersData.count ?? followersData;
        if (followingCountEl) followingCountEl.textContent = followingData.count ?? followingData;

        // --- 2. Cargar Reseñas (Recientes) ---
        
        // (Línea real COMENTADA)
        // const recentReviews = await window.reviewApi.getMyReviews(); 

        // (Línea de SIMULACIÓN (Mock) añadida con 7 reseñas)
        console.warn("Usando MOCK DATA para 'Reseñas Recientes'.");
        const recentReviews = [
            { id: 101, userId: 1, username: "TuUsuarioDePrueba", avatar: "../../Assets/default-avatar.png", title: "Currents - Tame Impala", text: "Reseña 1 (Editable)", stars: 5, likes: 0, userLiked: false },
            { id: 102, userId: 99, username: "MusicFan88", avatar: "https://placehold.co/40x40/634F94/F0F0F0?text=M", title: "Random Access Memories", text: "Reseña 2 (No editable)", stars: 4.5, likes: 22, userLiked: true },
            { id: 103, userId: 98, username: "SaraTune", avatar: "https://placehold.co/40x40/9A7BFF/F0F0F0?text=S", title: "After Hours - The Weeknd", text: "Reseña 3", stars: 4, likes: 15, userLiked: false },
            { id: 104, userId: 1, username: "TuUsuarioDePrueba", avatar: "../../Assets/default-avatar.png", title: "The Dark Side of the Moon", text: "Reseña 4 (No editable)", stars: 5, likes: 8, userLiked: false },
            { id: 105, userId: 97, username: "GrooveMaster", avatar: "https://placehold.co/40x40/FF4757/F0F0F0?text=G", title: "Vulfpeck - The Beautiful Game", text: "Reseña 5", stars: 4.5, likes: 3, userLiked: false },
            { id: 106, userId: 96, username: "LofiLover", avatar: "https://placehold.co/40x40/FFD85E/2A1A45?text=L", title: "Modal Soul - Nujabes", text: "Reseña 6", stars: 5, likes: 19, userLiked: true },
            { id: 107, userId: 1, username: "TuUsuarioDePrueba", avatar: "../../Assets/default-avatar.png", title: "OK Computer - Radiohead", text: "Reseña 7", stars: 5, likes: 2, userLiked: false }
        ];
        
        if (recentContainer) {
            if (Array.isArray(recentReviews) && recentReviews.length > 0) {
                // (Esta función 'renderReviewList' debe estar en reviewList.js)
                renderReviewList(recentContainerId, recentReviews);
            } else {
                recentContainer.innerHTML = "<p class='text-muted'>No hay reseñas recientes.</p>";
            }
        }
        if (reviewCountEl) reviewCountEl.textContent = recentReviews.length || 0;
        
        // --- 3. (Sección del carrusel ELIMINADA de aquí) ---
        // 'profile.js' se encarga del carrusel por separado.
        // Esto arregla el error "renderReviewCarousel is not defined".

    } catch (error) {
        console.error("❌ Error al cargar el perfil completo:", error);
        
        if (userAvatarEl) userAvatarEl.src = defaultAvatar;
        if (userNameEl) userNameEl.textContent = "Error al cargar";
        if (recentContainer) recentContainer.innerHTML = "<p class='text-danger'>Error al cargar reseñas.</p>";
    }
}