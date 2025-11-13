

export function initializeTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 1. Obtener el 'data-tab' del botón (ej. "canciones")
            const targetTab = button.getAttribute('data-tab');
            const targetPane = document.getElementById(`tab-${targetTab}`);

            // 2. Quitar 'active' de todos los botones y pestañas
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            // 3. Añadir 'active' solo al botón y pestaña clickeados
            button.classList.add('active');
            targetPane.classList.add('active');
        });
    });
}