export function createBestReviewCard(title, stars, likes, avatar) {
    const uniqueId = `like-${Math.random().toString(36).substr(2, 9)}`;

    return `
        <div class="best-review-card d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center">
                <img src="${avatar}" alt="avatar" class="review-avatar me-3 rounded-circle">
                <div>
                    <p class="mb-1 fw-semibold">${title}</p>
                    <div class="review-stars">
                        ${'⭐'.repeat(stars)}${'☆'.repeat(5 - stars)}
                    </div>
                </div>
            </div>

            <!-- ❤️ Botón de likes -->
            <div class="likes d-flex align-items-center">
                <button 
                    class="like-btn border-0 bg-transparent" 
                    id="${uniqueId}" 
                    data-likes="${likes}" 
                    onclick="toggleLike('${uniqueId}')"
                >
                    <i class="fa-solid fa-heart"></i>
                </button>
                <span class="like-count ms-1">${likes}</span>
            </div>
        </div>
    `;
}
window.toggleLike = function(id) {
    const btn = document.getElementById(id);
    const icon = btn.querySelector("i");
    const countSpan = btn.nextElementSibling;

    let likes = parseInt(btn.getAttribute("data-likes"));
    const isLiked = btn.classList.toggle("liked");

    if (isLiked) {
        likes += 1;
        icon.style.color = "red";
    } else {
        likes -= 1;
        icon.style.color = "gray";
    }

    btn.setAttribute("data-likes", likes);
    countSpan.textContent = likes;
};
