
export function createAudioPlayer(url, id) {
    if (!url) return `<div class="audio-placeholder"><i class="fas fa-volume-mute"></i> Sin vista previa</div>`;

    return `
    <div class="custom-audio-player" id="player-${id}">
        <audio id="audio-${id}" src="${url}"></audio>
        <div class="player-controls">
            <button class="play-btn" onclick="togglePlay('${id}')">
                <i class="fas fa-play" id="icon-${id}"></i>
            </button>
            <div class="progress-container" onclick="seekAudio(event, '${id}')">
                <div class="progress-bar" id="progress-${id}"></div>
            </div>
            <span class="time-display" id="time-${id}">0:00</span>
        </div>
    </div>`;
}

// Lógica global para manejar la reproducción (Play/Pause, barra de progreso)
// Esto debe estar disponible en el scope global (window) porque los onclick lo llaman.
window.togglePlay = function(id) {
    const audio = document.getElementById(`audio-${id}`);
    const icon = document.getElementById(`icon-${id}`);
    
    // Pausar todos los otros audios antes de reproducir este
    document.querySelectorAll('audio').forEach(a => {
        if (a.id !== `audio-${id}`) {
            a.pause();
            a.currentTime = 0; // Opcional: reiniciar
            // Resetear icono del otro player
            const otherId = a.id.replace('audio-', '');
            const otherIcon = document.getElementById(`icon-${otherId}`);
            if(otherIcon) otherIcon.className = 'fas fa-play';
        }
    });

    if (audio.paused) {
        audio.play();
        icon.className = 'fas fa-pause';
    } else {
        audio.pause();
        icon.className = 'fas fa-play';
    }

    // Actualizar barra de progreso
    audio.ontimeupdate = () => {
        const progress = document.getElementById(`progress-${id}`);
        const timeDisplay = document.getElementById(`time-${id}`);
        const percent = (audio.currentTime / audio.duration) * 100;
        progress.style.width = `${percent}%`;
        
        // Formatear tiempo
        let mins = Math.floor(audio.currentTime / 60);
        let secs = Math.floor(audio.currentTime % 60);
        if (secs < 10) secs = '0' + secs;
        timeDisplay.textContent = `${mins}:${secs}`;
    };
    
    // Resetear icono al terminar
    audio.onended = () => {
        icon.className = 'fas fa-play';
        document.getElementById(`progress-${id}`).style.width = '0%';
    };
};

window.seekAudio = function(e, id) {
    const audio = document.getElementById(`audio-${id}`);
    const container = e.currentTarget; // el div progress-container
    const width = container.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;
    
    audio.currentTime = (clickX / width) * duration;
};