export function createHeader() {
    return `
    <header class="header">
        <div class="d-flex align-items-center">
            <i class="fa-solid fa-user-astronaut fa-2x me-2"></i>
            <div class="search-bar">
                <input type="text" placeholder="Buscar canción, artista, usuario">
            </div>
        </div>
        <div>
            <button class="btn-nav">INICIO</button>
            <button class="btn-nav">RANKINGS</button>
            <button class="btn-nav">EXPLORAR</button>
            <i class="fa-regular fa-bell ms-3"></i>
            <i class="fa-solid fa-user-gear ms-3"></i>
        </div>
    </header>
    `;
}
