import { userData } from "../../JS/APIs/userApi.js";
import { createReviewCard } from "../../JS/Components/reviewCard.js";
import { createBestReviewCard } from "../../JS/Components/bestReviewCard.js";

export async function loadUserProfile() {
    console.log("👤 Cargando perfil...");

    const recentContainer = document.getElementById("recent-reviews");
    const bestCarousel = document.querySelector("#reviewsCarousel .carousel-inner");
    const defaultAvatar = "../../assets/SOUDLIST_FRONTENDassetsimgdefault-avatar.png";

    if (recentContainer) recentContainer.innerHTML = "<p class='text-muted'>Cargando reseñas...</p>";
    if (bestCarousel) bestCarousel.innerHTML = `
        <div class="carousel-item active">
            <div class="text-center text-muted py-4">Cargando mejores reseñas...</div>
        </div>
    `;

    try {
        const response = await fetch("http://localhost:3000/api/user-profile");
        if (!response.ok) throw new Error("Error al obtener datos del backend");

        const data = await response.json();
        console.log("✅ Datos obtenidos del backend:", data);

        const userAvatar = document.querySelector(".profile-avatar");
        const userName = document.querySelector(".username");
        const userQuote = document.querySelector(".user-quote");
        const reviewCount = document.getElementById("user-reviews");
        const followingCount = document.getElementById("user-following");
        const followerCount = document.getElementById("user-followers");


        if (userAvatar) userAvatar.src = data.image || defaultAvatar;
        if (userName) userName.textContent = data.username || "Usuario sin nombre";
        if (userQuote) userQuote.textContent = data.quote || "Sin frase personal";
        if (reviewCount) reviewCount.textContent = data.reviews?.length || 0;
        if (followingCount) followingCount.textContent = data.following || 0;
        if (followerCount) followerCount.textContent = data.followers || 0;

        if (recentContainer) {
            recentContainer.innerHTML = "";
            const reviews = data.recentReviews?.length ? data.recentReviews : userData.reviews;

            reviews.forEach(r => {
                recentContainer.innerHTML += createReviewCard(
                    r.username || data.username,
                    r.title || "Sin título",
                    r.text || "Sin contenido",
                    r.stars || 0
                );
            });
        }

        if (bestCarousel) {
            bestCarousel.innerHTML = "";
            const best = data.bestReviews?.length ? data.bestReviews : userData.bestReviews;

            best.forEach((b, i) => {
                const isActive = i === 0 ? "active" : "";
                const stars = "⭐".repeat(b.stars || 0) + "☆".repeat(5 - (b.stars || 0));

                bestCarousel.innerHTML += `
                    <div class="carousel-item ${isActive}">
                        <div class="card p-3" style="background-color: var(--blanco); border-radius: 12px;">
                            <div class="d-flex align-items-center mb-2">
                                <img src="${b.userImage || data.image || defaultAvatar}" alt="user" class="rounded-circle me-2" width="45" height="45">
                                <div>
                                    <h6 class="fw-bold mb-0">${b.username || data.username}</h6>
                                    <div class="review-stars">${stars}</div>
                                </div>
                            </div>
                            <p class="text-muted small mb-2">“${b.text || "Sin reseña"}”</p>
                            <div class="text-end">
                                <button class="btn btn-link p-0 like-btn">
                                    <i class="fa-solid fa-heart text-danger"></i>
                                </button>
                                <span class="like-count">${b.likes || 0}</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            bestCarousel.querySelectorAll(".like-btn").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    const count = e.currentTarget.nextElementSibling;
                    count.textContent = parseInt(count.textContent) + 1;
                });
            });
        }

    } catch (error) {

        console.warn("⚠️ No se pudo conectar con el backend. Usando datos locales.", error);

        const userAvatar = document.querySelector(".profile-avatar");
        const userName = document.querySelector(".username");
        const userQuote = document.querySelector(".user-quote");

        if (userAvatar) userAvatar.src = userData.image || defaultAvatar;
        if (userName) userName.textContent = userData.username;
        if (userQuote) userQuote.textContent = userData.quote || "Sin frase personal";

        
        document.querySelectorAll(".stats strong")[0].textContent = userData.reviews.length;
        document.querySelectorAll(".stats strong")[1].textContent = userData.following;
        document.querySelectorAll(".stats strong")[2].textContent = userData.followers;

        if (recentContainer) {
            recentContainer.innerHTML = "";
            userData.reviews.forEach(r => {
                recentContainer.innerHTML += createReviewCard(
                    userData.username,
                    r.title,
                    r.text,
                    r.stars
                );
            });
        }

        if (bestCarousel) {
            bestCarousel.innerHTML = "";
            userData.bestReviews.forEach((b, i) => {
                const isActive = i === 0 ? "active" : "";
                const stars = "⭐".repeat(b.stars || 0) + "☆".repeat(5 - (b.stars || 0));
                bestCarousel.innerHTML += `
                    <div class="carousel-item ${isActive}">
                        <div class="card p-3" style="background-color: var(--blanco); border-radius: 12px;">
                            <div class="d-flex align-items-center mb-2">
                                <img src="${userData.image || defaultAvatar}" alt="user" class="rounded-circle me-2" width="45" height="45">
                                <div>
                                    <h6 class="fw-bold mb-0">${userData.username}</h6>
                                    <div class="review-stars">${stars}</div>
                                </div>
                            </div>
                            <p class="text-muted small mb-2">“${b.title}”</p>
                            <div class="text-end">
                                <button class="btn btn-link p-0 like-btn">
                                    <i class="fa-solid fa-heart text-danger"></i>
                                </button>
                                <span class="like-count">${b.likes}</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            bestCarousel.querySelectorAll(".like-btn").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    const count = e.currentTarget.nextElementSibling;
                    count.textContent = parseInt(count.textContent) + 1;
                });
            });
        }
    }
    initMenus();
}
function initMenus() {
    document.addEventListener("click", (event) => {
        const isMenuButton = event.target.classList.contains("review-options");
        const isMenu = event.target.closest(".review-menu");

        if (!isMenuButton && !isMenu) {
            document.querySelectorAll(".review-menu").forEach(menu => {
                menu.classList.remove("visible");
            });
        }
    });
}

window.toggleMenu = function(id) {
    const allMenus = document.querySelectorAll(".review-menu");
    const clickedMenu = document.getElementById(id);

    allMenus.forEach(menu => {
        if (menu !== clickedMenu) menu.classList.remove("visible");
    });

    if (clickedMenu) clickedMenu.classList.toggle("visible");
};

/*import { 
    getUserProfile, 
    getUserFollowers, 
    getUserFollowing, 
    getUserRecentReviews, 
    getUserBestReviews 
} from "../../JS/APIs/userApi.js";
import { createReviewCard } from "../../JS/Components/reviewCard.js";
import { createBestReviewCard } from "../../JS/Components/bestReviewCard.js";

export async function loadUserProfile() {
    console.log("👤 Cargando perfil desde backend...");

    const recentContainer = document.getElementById("recent-reviews");
    const bestCarousel = document.querySelector("#reviewsCarousel .carousel-inner");
    const reviewCount = document.querySelector(".stats strong:nth-child(1)");
    const followingCount = document.querySelector(".stats strong:nth-child(2)");
    const followerCount = document.querySelector(".stats strong:nth-child(3)");
    const defaultAvatar = "../../assets/SOUDLIST_FRONTENDassetsimgdefault-avatar.png";

    if (recentContainer) recentContainer.innerHTML = "<p class='text-muted'>Cargando reseñas...</p>";
    if (bestCarousel) bestCarousel.innerHTML = `
        <div class="carousel-item active">
            <div class="text-center text-muted py-4">Cargando mejores reseñas...</div>
        </div>
    `;

    try {

        const user = await getUserProfile();
        console.log("✅ Perfil:", user);

        const userAvatar = document.querySelector(".profile-avatar");
        const userName = document.querySelector(".username");
        const userQuote = document.querySelector(".user-quote");

        if (userAvatar) userAvatar.src = user.image || defaultAvatar;
        if (userName) userName.textContent = user.username || "Usuario sin nombre";
        if (userQuote) userQuote.textContent = user.quote || "Sin frase personal";

        const followers = await getUserFollowers();
        const following = await getUserFollowing();

        if (followerCount) followerCount.textContent = followers.length || 0;
        if (followingCount) followingCount.textContent = following.length || 0;


        const recentReviews = await getUserRecentReviews();
        if (recentContainer) {
            recentContainer.innerHTML = "";
            if (Array.isArray(recentReviews) && recentReviews.length > 0) {
                recentReviews.forEach(r => {
                    recentContainer.innerHTML += createReviewCard(
                        r.username || user.username,
                        r.title || "Sin título",
                        r.text || "Sin contenido",
                        r.stars || 0,
                        r.avatar || user.image || defaultAvatar
                    );
                });
            } else {
                recentContainer.innerHTML = "<p class='text-muted'>No hay reseñas recientes.</p>";
            }
        }

        const bestReviews = await getUserBestReviews();
        if (bestCarousel) {
            bestCarousel.innerHTML = "";
            if (Array.isArray(bestReviews) && bestReviews.length > 0) {
                bestReviews.forEach((b, i) => {
                    const isActive = i === 0 ? "active" : "";
                    const stars = "⭐".repeat(b.stars || 0) + "☆".repeat(5 - (b.stars || 0));

                    bestCarousel.innerHTML += `
                        <div class="carousel-item ${isActive}">
                            <div class="card p-3" style="background-color: var(--blanco); border-radius: 12px;">
                                <div class="d-flex align-items-center mb-2">
                                    <img src="${b.avatar || user.image || defaultAvatar}" alt="user" class="rounded-circle me-2" width="45" height="45">
                                    <div>
                                        <h6 class="fw-bold mb-0">${b.username || user.username}</h6>
                                        <div class="review-stars">${stars}</div>
                                    </div>
                                </div>
                                <p class="text-muted small mb-2">“${b.text || "Sin reseña"}”</p>
                                <div class="text-end">
                                    <button class="btn btn-link p-0 like-btn">
                                        <i class="fa-solid fa-heart text-danger"></i>
                                    </button>
                                    <span class="like-count">${b.likes || 0}</span>
                                </div>
                            </div>
                        </div>
                    `;
                });

                bestCarousel.querySelectorAll(".like-btn").forEach(btn => {
                    btn.addEventListener("click", (e) => {
                        const count = e.currentTarget.nextElementSibling;
                        count.textContent = parseInt(count.textContent) + 1;
                    });
                });
            } else {
                bestCarousel.innerHTML = `
                    <div class="carousel-item active">
                        <div class="text-center text-muted py-4">No hay mejores reseñas.</div>
                    </div>
                `;
            }
        }

    
        if (reviewCount) reviewCount.textContent = recentReviews.length || 0;

    } catch (error) {
        console.error("❌ Error al cargar perfil desde backend:", error);
        if (recentContainer) recentContainer.innerHTML = "<p class='text-danger'>Error al cargar reseñas.</p>";
        if (bestCarousel) bestCarousel.innerHTML = "<p class='text-danger'>Error al cargar mejores reseñas.</p>";
    }

    initMenus();
}

function initMenus() {
    document.addEventListener("click", (event) => {
        const isMenuButton = event.target.classList.contains("review-options");
        const isMenu = event.target.closest(".review-menu");

        if (!isMenuButton && !isMenu) {
            document.querySelectorAll(".review-menu").forEach(menu => {
                menu.classList.remove("visible");
            });
        }
    });
}

window.toggleMenu = function(id) {
    const allMenus = document.querySelectorAll(".review-menu");
    const clickedMenu = document.getElementById(id);
    allMenus.forEach(menu => {
        if (menu !== clickedMenu) menu.classList.remove("visible");
    });
    if (clickedMenu) clickedMenu.classList.toggle("visible");
};

*/