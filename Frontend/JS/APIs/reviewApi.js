export async function getRecentReviews() {
    try {
        const response = await fetch("https://tu-backend.com/api/reviews/recent");

        if (!response.ok) {
            throw new Error("Error al obtener reseñas recientes");
        }
        const data = await response.json();
        return data;

    } catch (error) {
        console.error("❌ Error al conectar con el backend:", error);
        throw error;
    }
}
