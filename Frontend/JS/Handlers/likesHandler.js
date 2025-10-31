    document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".like-btn");
    if (!btn) return;

    const count = btn.nextElementSibling;
    const currentLikes = parseInt(count.textContent);
    count.textContent = currentLikes + 1;

    const reviewId = btn.dataset.reviewId;

    try {
        await fetch(`http://localhost:3000/api/reviews/${reviewId}/like`, {
        method: "POST"
        });
    } catch (error) {
        console.warn("⚠️ Error al enviar el like al servidor", error);
    }
    });
