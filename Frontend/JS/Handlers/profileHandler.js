
/**
 * Carga el perfil completo de un usuario dado su ID, conectando a la API.
 * @param {string} userIdToLoad - El ID del usuario cuyo perfil se va a mostrar.
 */
async function loadUserProfile(userIdToLoad) {
    console.log(`👤 Cargando perfil para ID: ${userIdToLoad}...`);

    const recentContainerId = "recent-reviews"; 
    const userAvatarEl = document.querySelector(".profile-avatar");
    const userNameEl = document.querySelector(".username");
    const userQuoteEl = document.querySelector(".user-quote");
    const reviewCountEl = document.getElementById("user-reviews");
    const followingCountEl = document.getElementById("user-following");
    const followerCountEl = document.getElementById("user-followers");
    const defaultAvatar ="../../Assets/default-avatar.png";

    const recentContainer = document.getElementById(recentContainerId);
    if (recentContainer) recentContainer.innerHTML = "<p class='text-muted p-4 text-center'>Cargando reseñas...</p>";

    try {

        const user = await window.userApi.getUserProfile(userIdToLoad); 

        const followerCount = await window.userApi.getFollowerCount(userIdToLoad);
        const followingCount = await window.userApi.getFollowingCount(userIdToLoad);
        
        console.log("✅ Perfil, seguidores y seguidos cargados de la API.");

        // Poblar Header de Perfil
        if (userAvatarEl) userAvatarEl.src = user.image || defaultAvatar;
        if (userNameEl) userNameEl.textContent = user.username || "Usuario";
        if (userQuoteEl) userQuoteEl.textContent = user.quote || "Sin frase personal";
        if (followerCountEl) followerCountEl.textContent = followerCount;
        if (followingCountEl) followingCountEl.textContent = followingCount;

        const recentReviews = await window.reviewApi.getReviewsByUser(userIdToLoad); 
        
        if (recentContainer) {
            if (Array.isArray(recentReviews) && recentReviews.length > 0) {
                renderReviewList(recentContainerId, recentReviews);
            } else {
                recentContainer.innerHTML = "<p class='text-muted p-4 text-center'>No hay reseñas recientes de este usuario.</p>";
            }
        }
        if (reviewCountEl) reviewCountEl.textContent = recentReviews.length || 0;
        
    } catch (error) {
        console.error("❌ Error al cargar el perfil completo:", error);
        
        if (userAvatarEl) userAvatarEl.src = defaultAvatar;
        if (userNameEl) userNameEl.textContent = "Error al cargar";
        if (userQuoteEl) userQuoteEl.textContent = "No disponible";
        if (recentContainer) recentContainer.innerHTML = "<p class='text-danger p-4 text-center'>Error al cargar reseñas.</p>";
        if (error.message && (error.message.includes('401') || error.message.includes('403'))) {
             window.showAlert("Sesión caducada o perfil privado.", "Error");
        }
    }
}