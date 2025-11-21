
export function renderAmigoCard(user) {
    const isFollowing = user.isFollowing;
    const buttonText = isFollowing ? 'Siguiendo' : 'Seguir';

    const buttonClass = isFollowing ? 'following' : 'follow'; 
    const iconClass = isFollowing ? 'fa-user-check' : 'fa-user-plus';
    const defaultAvatar = '../Assets/default-avatar.png'; 
    const bioText = user.bio || ''; 

        const normalizedId = String(user.userId || '').toLowerCase().trim();
    return `
        <div class="user-result-item" data-user-id="${normalizedId}">
            <img src="${user.imgProfile || defaultAvatar}" 
                alt="${user.username}" 
                class="user-result-avatar" 
                onerror="this.src='${defaultAvatar}'">
            <div class="user-result-info">
                <div class="user-result-username">${user.username}</div>
                <div class="user-result-bio">${bioText}</div>
            </div>
            <div class="user-result-actions">
                <button class="follow-btn ${buttonClass}" 
                        data-user-id="${normalizedId}"
                        data-username="${user.username}">
                    <i class="fas ${iconClass}"></i>
                    ${buttonText}
                </button>
            </div>
        </div>
    `;
}