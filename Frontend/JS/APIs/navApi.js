    export async function getInicioData() {
    try {
        const response = await fetch("http://localhost:3000/api/inicio");
        if (!response.ok) throw new Error("Error al obtener datos de Inicio");
        return await response.json();
    } catch (error) {
        console.error("❌ Error en getInicioData:", error);
        throw error;
    }
}

export async function getRankingsData() {
    try {
        const response = await fetch("http://localhost:3000/api/rankings");
        if (!response.ok) throw new Error("Error al obtener Rankings");
        return await response.json();
    } catch (error) {
        console.error("❌ Error en getRankingsData:", error);
        throw error;
    }
}

export async function getExplorarData() {
    try {
        const response = await fetch("http://localhost:3000/api/explorar");
        if (!response.ok) throw new Error("Error al obtener datos de Explorar");
        return await response.json();
    } catch (error) {
        console.error("❌ Error en getExplorarData:", error);
        throw error;
    }
}
