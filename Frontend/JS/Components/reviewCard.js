export function createReviewCard(username, title, reviewText, stars, avatar) {
    const menuId = `menu-${Math.random().toString(36).substr(2, 9)}`;

    return `
        <div class="review-card position-relative">
            <div class="d-flex justify-content-between align-items-start">
                <div class="d-flex align-items-center">
                    <img src="${avatar}" alt="avatar" class="review-avatar me-2 rounded-circle">
                    <h6>${username} – ${title}</h6>
                </div>

                <!-- Ícono de opciones -->
                <i class="fa-solid fa-ellipsis-vertical review-options" onclick="toggleMenu('${menuId}', event)"></i>
            </div>

            <div class="review-content d-flex justify-content-between align-items-center">
                <p class="mb-0">${reviewText}</p>
                <div class="review-stars">
                    ${'⭐'.repeat(stars)}${'☆'.repeat(5 - stars)}
                </div>
            </div>

            <!-- Menú de opciones -->
            <div id="${menuId}" class="review-menu">
                <button onclick="handleMenuAction('edit', event)"><i class="fa-solid fa-pen"></i> Editar</button>
                <button onclick="handleMenuAction('delete', event)"><i class="fa-solid fa-trash"></i> Eliminar</button>
                <button onclick="handleMenuAction('report', event)"><i class="fa-solid fa-flag"></i> Reportar</button>
            </div>
        </div>
    `;
}
export function handleMenuAction(action, event) {
    event.stopPropagation(); 
    if (action === 'edit') alert('Editar reseña');
    else if (action === 'delete') alert('Eliminar reseña');
    else if (action === 'report') alert('Reportar reseña');
}
window.toggleMenu = function (menuId, event) {
    event.stopPropagation();

    const menu = document.getElementById(menuId);

 
    document.querySelectorAll(".review-menu.visible").forEach(m => {
        if (m !== menu) {
            m.classList.remove("visible");
            m.style.display = "none";
        }
    });

    const isVisible = menu.classList.contains("visible");
    if (isVisible) {
        menu.classList.remove("visible");
        menu.style.display = "none";
        return;
    }

    
    const icon = event.currentTarget;
    const rect = icon.getBoundingClientRect();

 
    const scrollParent = icon.closest(".reviews-container");
    const extraScroll = scrollParent ? scrollParent.scrollTop : 0;

  
   document.body.appendChild(menu);
menu.style.position = "absolute";
menu.style.top = `${rect.bottom + window.scrollY + extraScroll + 5}px`;
menu.style.left = `${rect.right - 160}px`;
menu.style.zIndex = "999999999";
menu.style.pointerEvents = "auto";
menu.style.display = "block";


menu.classList.add("visible");
};

document.addEventListener("click", (e) => {
    if (!e.target.closest(".review-menu") && !e.target.closest(".review-options")) {
        document.querySelectorAll(".review-menu.visible").forEach(m => {
            m.classList.remove("visible");
            m.style.display = "none";
        });
    }
});
