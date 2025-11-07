
function setupHeaderHandlers() {
    
    const userMenuButton = document.getElementById("userMenuButton");
    const userMenuDropdown = document.getElementById("userMenuDropdown");
    const logoutButton = document.getElementById("logoutButton");

    if (userMenuButton) {
        userMenuButton.addEventListener("click", (e) => {
            e.stopPropagation(); 
            userMenuDropdown.classList.toggle("show");
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", (e) => {
            e.preventDefault(); 
            localStorage.removeItem("authToken");
            localStorage.removeItem("userId");
            localStorage.removeItem("username");
            localStorage.removeItem("userAvatar");
            
            alert("Has cerrado sesión.");

            window.location.reload(); 
        });
    }

    document.addEventListener("click", (e) => {
        if (userMenuDropdown && !e.target.closest(".user-menu-wrapper")) {
            userMenuDropdown.classList.remove("show");
        }

        const notifDropdown = document.getElementById("notificationDropdown");
        if (notifDropdown && !e.target.closest(".notification-wrapper")) {
            notifDropdown.classList.remove("show");
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {

    if (!document.getElementById("header-placeholder")) {
        setupHeaderHandlers();
    }
});