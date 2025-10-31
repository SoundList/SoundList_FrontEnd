    export async function updateUserProfile(profileData) {
    try {
        const response = await fetch("http://localhost:3000/api/user/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profileData)
        });

        if (!response.ok) throw new Error("Error al actualizar el perfil");

        const data = await response.json();
        console.log("✅ Perfil actualizado correctamente:", data);
        return data;
    } catch (error) {
        console.error("❌ Error en la API de perfil:", error);
        return null;
    }
}
