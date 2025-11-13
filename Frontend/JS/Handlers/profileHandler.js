async function loadUserProfile(userIdToLoad) {

    const loggedInUserId = localStorage.getItem("userId"); 
    
    console.log(`👤 Cargando perfil para ID: ${userIdToLoad}...`);

    const recentContainerId = "recent-reviews"; 
    const userAvatarEl = document.querySelector(".profile-avatar");
    const userNameEl = document.querySelector(".username");
    const userQuoteEl = document.querySelector(".user-quote");
    const reviewCountEl = document.getElementById("user-reviews");
    const followerCountEl = document.getElementById("user-followers");
    const followingCountEl = document.getElementById("user-following");
    const defaultAvatar ="../../Assets/default-avatar.png";

    const editBtn = document.querySelector(".btn-edit");

    if (editBtn) editBtn.style.display = 'none'; 

    const recentContainer = document.getElementById(recentContainerId);
    if (recentContainer) recentContainer.innerHTML = "<p class='text-muted p-4 text-center'>Cargando reseñas...</p>";

    let user = null; 


    try {

        user = await window.userApi.getUserProfile(userIdToLoad); 

        if (userAvatarEl) userAvatarEl.src = user.imgProfile || defaultAvatar; 
        if (userNameEl) userNameEl.textContent = user.Username || "Usuario"; 
        if (userQuoteEl) userQuoteEl.textContent = user.Bio || "Sin frase personal"; 
        
        console.log("✅ Perfil principal cargado:", user);

        const isOwner = (loggedInUserId === userIdToLoad);
        if (isOwner && editBtn) {
            editBtn.style.display = 'block';
            editBtn.onclick = () => window.location.href = 'editProfile.html';
        }

    } catch (error) {
        console.error("❌ Error al cargar el perfil principal:", error);

        if (userAvatarEl) userAvatarEl.src = defaultAvatar;
        if (userNameEl) userNameEl.textContent = "Error al cargar";
        if (userQuoteEl) userQuoteEl.textContent = "No disponible";
        return; 
    }



    try {
        const followerCount = await window.userApi.getFollowerCount(userIdToLoad);
        const followingCount = await window.userApi.getFollowingCount(userIdToLoad);
        
        if (followerCountEl) followerCountEl.textContent = followerCount || 0;
        if (followingCountEl) followingCountEl.textContent = followingCount || 0;
        
    } catch (followError) {
        console.warn("⚠️ Fallo al cargar contadores de Follows (esperado si no hay mock):", followError.message);
        if (followerCountEl) followerCountEl.textContent = 0;
        if (followingCountEl) followingCountEl.textContent = 0;
    }


    try {
        const recentReviews = await window.reviewApi.getReviewsByUser(userIdToLoad); 
        
        if (recentContainer) {
            if (Array.isArray(recentReviews) && recentReviews.length > 0) {
                if (typeof renderReviewList === 'function') {
                    renderReviewList(recentContainerId, recentReviews);
                }
            } else {
                recentContainer.innerHTML = "<p class='text-muted p-4 text-center'>No hay reseñas recientes de este usuario.</p>";
            }
        }
        if (reviewCountEl) reviewCountEl.textContent = recentReviews.length || 0;
        
    } catch (reviewError) {
        console.error("❌ Error al cargar reseñas:", reviewError);
        if (recentContainer) recentContainer.innerHTML = "<p class='text-danger p-4 text-center'>Error al cargar reseñas.</p>";
        if (reviewCountEl) reviewCountEl.textContent = 0;
    }
}