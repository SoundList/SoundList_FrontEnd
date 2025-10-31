const API_BASE_URL = "http://localhost:3000/api"; 
export const userData = { 
  username: "WakaPato12",
  image: "../../assets/SOUDLIST_FRONTENDassetsimgdefault-avatar.png",
  quote: "La música es para mí lo que para el Diego era la pelota",
  reviews: [
    { title: "Creep - RadioHead", text: "Para el gym no hay mejor que esta canción", stars: 4 },
    { title: "Mi Vecinita - Plan B", text: "Temón de los que ya no hay, para mí tiene todo", stars: 5 },
    { title: "Hoy te vi - La Liga", text: "Un poco personal este tema, pero tiene magia", stars: 4 },
    { title: "Creep - RadioHead", text: "Para el gym no hay mejor que esta canción", stars: 4 },
    { title: "Mi Vecinita - Plan B", text: "Temón de los que ya no hay, para mí tiene todo", stars: 5 },
    { title: "Hoy te vi - La Liga", text: "Un poco personal este tema, pero tiene magia", stars: 4 }
  ],

  bestReviews: [
    { title: "Creep - RadioHead", stars: 4, likes: 260 },
    { title: "Mi Vecinita - Plan B", stars: 5, likes: 221 },
    { title: "Hoy te vi - La Liga", stars: 4, likes: 90 }
  ],
  followers: 5,
  following: 3
};

export async function getUserProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/user/profile`);
    if (!response.ok) throw new Error("Error al obtener el perfil");
    return await response.json();
  } catch (error) {
    console.warn("⚠️ Usando datos locales (fallback):", error);
    return userData;
  }
}

export async function getUserFollowers() {
  try {
    const response = await fetch(`${API_BASE_URL}/user/followers`);
    if (!response.ok) throw new Error("Error al obtener followers");
    return await response.json();
  } catch {
    return { followers: userData.followers };
  }
}

export async function getUserFollowing() {
  try {
    const response = await fetch(`${API_BASE_URL}/user/following`);
    if (!response.ok) throw new Error("Error al obtener following");
    return await response.json();
  } catch {
    return { following: userData.following }; 
  }
}

export function updateUserProfile(newData) {
  userData.username = newData.username || userData.username;
  userData.image = newData.image || userData.image;
  userData.quote = newData.quote || userData.quote;
  return userData;
}
/*
// URL base del backend
const BASE_URL = "http://localhost:3000/api";

export async function getUserProfile() {
    try {
        const response = await fetch(`${BASE_URL}/user-profile`);
        if (!response.ok) throw new Error("Error al obtener perfil de usuario");
        return await response.json();
    } catch (error) {
        console.error("❌ Error getUserProfile:", error);
        throw error;
    }
}

export async function getUserFollowers() {
    try {
        const response = await fetch(`${BASE_URL}/user-followers`);
        if (!response.ok) throw new Error("Error al obtener seguidores");
        return await response.json();
    } catch (error) {
        console.error("❌ Error getUserFollowers:", error);
        throw error;
    }
}

export async function getUserFollowing() {
    try {
        const response = await fetch(`${BASE_URL}/user-following`);
        if (!response.ok) throw new Error("Error al obtener seguidos");
        return await response.json();
    } catch (error) {
        console.error("❌ Error getUserFollowing:", error);
        throw error;
    }
}

export async function getUserRecentReviews() {
    try {
        const response = await fetch(`${BASE_URL}/user-reviews/recent`);
        if (!response.ok) throw new Error("Error al obtener reseñas recientes");
        return await response.json();
    } catch (error) {
        console.error("❌ Error getUserRecentReviews:", error);
        throw error;
    }
}

export async function getUserBestReviews() {
    try {
        const response = await fetch(`${BASE_URL}/user-reviews/best`);
        if (!response.ok) throw new Error("Error al obtener mejores reseñas");
        return await response.json();
    } catch (error) {
        console.error("❌ Error getUserBestReviews:", error);
        throw error;
    }
}
*/