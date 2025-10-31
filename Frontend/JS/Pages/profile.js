
import { loadUserProfile } from "../../JS/Handlers/profileHandler.js";

document.addEventListener("DOMContentLoaded", async () => {
    console.log("✅ Profile page cargada correctamente");
    await loadUserProfile();
});
