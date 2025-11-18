
export function renderAmigoCard(user) {
    const isFollowing = user.isFollowing;
    const buttonText = isFollowing ? 'Siguiendo' : 'Seguir';

    const buttonClass = isFollowing ? 'following' : 'follow'; 
    const iconClass = isFollowing ? 'fa-user-check' : 'fa-user-plus';
    const defaultAvatar = '../Assets/default-avatar.png'; 

    return `
        <div class="user-result-item" data-user-id="${user.id}">
            <img src="${user.avatar || defaultAvatar}" 
                alt="${user.username}" 
                class="user-result-avatar" 
                onerror="this.src='${defaultAvatar}'">
            <div class="user-result-info">
                <div class="user-result-username">${user.username}</div>
                <div class="user-result-bio">${user.bio}</div>
            </div>
            <div class="user-result-actions">
                <button class="follow-btn ${buttonClass}" 
                        data-user-id="${user.id}"
                        data-username="${user.username}">
                    <i class="fas ${iconClass}"></i>
                    ${buttonText}
                </button>
            </div>
        </div>
    `;
}