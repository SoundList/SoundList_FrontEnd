import { updateUserProfile } from "../../JS/APIs/userApi.js";

export function setupEditProfileButton() {
    const editBtn = document.querySelector(".btn-edit");

    if (!editBtn) {
        console.warn("⚠️ No se encontró el botón 'Editar Perfil'");
        return;
    }

    editBtn.addEventListener("click", async () => {
        console.log("🟣 Botón 'Editar Perfil' clickeado");

        editBtn.classList.add("clicked");
        setTimeout(() => editBtn.classList.remove("clicked"), 300);

        const newProfileData = {
            nombre: "Nuevo nombre",
            bio: "Nueva bio actualizada",
        };

        try {
            const result = await updateUserProfile(newProfileData);
            alert("✅ Perfil actualizado correctamente");
            console.log("Resultado:", result);
        } catch (error) {
            alert("❌ Error al actualizar el perfil. Intenta nuevamente.");
        }
    });
}

document.addEventListener("DOMContentLoaded", setupEditProfileButton);
