//  ---  IMPORTACIONES  ---
import  {
getArtistByApiId,
getArtistTopTracksByApiId,
getArtistAlbumsByApiId
}  from  './../APIs/contentApi.js';
import  {  createSongListItem,  createStarRating,  createAlbumListItem  }  from  './../Components/renderContent.js';  
import  {  initializeTabNavigation  }  from  './../Handlers/albumHandler.js'; 
import { showAlert } from '../Utils/reviewHelpers.js';

//  ---  3.  PUNTO  DE  ENTRADA  (LLAMADO  POR  MAIN.JS)  ---
export  function  initializeArtistPage()  {
                console.log("DOM  de  Artista  cargado.  Inicializando  lógica...");
                initializeTabNavigation();
        const  btnAgregar  =  document.getElementById('btnAgregarResena');
        if  (btnAgregar)  {
                btnAgregar.disabled  =  true;
                btnAgregar.style.opacity  =  '0.5';
                btnAgregar.style.cursor  =  'not-allowed';
                btnAgregar.title  =  'No  se  pueden  crear  reseñas  de  artistas';
        }
        loadPageData();

}

//  ---  FUNCIONES  PRINCIPALES  ---

async  function  loadPageData()  {
        const  loadingEl  =  document.getElementById('loadingSpinner');
        const  contentEl  =  document.getElementById('artistContent');
        try  {
                const  params  =  new  URLSearchParams(window.location.search);
                const  apiArtistId  =  params.get('id');
                        
                        if (!apiArtistId || apiArtistId.trim() === '' || 
                        apiArtistId === 'undefined' || apiArtistId === 'null' ||
                        apiArtistId.toLowerCase() === 'album' || apiArtistId.toLowerCase() === 'artist' || apiArtistId.toLowerCase() === 'song') {
                        throw new Error("ID de artista inválido en la URL. Por favor, busca el artista nuevamente.");
                        }
                        
                        console.log(`Cargando artista con ID: ${apiArtistId}`);
                        console.log(`Buscando  artista  con  ID:  ${apiArtistId}`);
                contentEl.style.display  =  'none';
                loadingEl.style.display  =  'block';
                //  1.  Obtener  datos  principales
                const  artistData  =  await  getArtistByApiId(apiArtistId);
                        console.log("Datos  del  artista:",  artistData);
                //  2.  Renderizar  header
                renderArtistHeader(artistData);
                //  3.  Obtener  el  resto  en  paralelo
                const  [topTracks,  albums]  =  await  Promise.all([
                        getArtistTopTracksByApiId(apiArtistId),
                        getArtistAlbumsByApiId(apiArtistId)
                ]);
                        console.log("Canciones:",  topTracks);
                        console.log("Álbumes:",  albums);
                //  4.  Renderizar  listas  y  tabs
                renderTopTracks(topTracks);
                renderAlbums(albums);
                
                // AQUÍ LLAMAMOS A LA FUNCIÓN DE DETALLES CORREGIDA
                renderArtistDetails(artistData);
                
                contentEl.style.display  =  'block';
        }  catch  (error)  {
                console.error("Error  fatal  al  cargar  página  de  artista:",  error);
                        showAlert(`Error  al  cargar  el  artista:  ${error.message}`,  'danger');
                contentEl.innerHTML  =  `<h2  style="color:  white;  text-align:  center;  padding:  4rem;">Error  al  cargar  el  artista:  ${error.message}</h2>`;
                contentEl.style.display  =  'block';
        }  finally  {
                loadingEl.style.display  =  'none';
        }
        }
        //  ---  FUNCIONES  DE  RENDERIZADO  ---

        function renderArtistHeader(artist) {
        console.log("--- Iniciando renderArtistHeader ---");
        
        const coverEl = document.getElementById('artistCover');
        const nameEl = document.getElementById('artistName');
        
        console.log("artistCover:", coverEl);
        console.log("artistName:", nameEl); 
        if (!coverEl || !nameEl ) {
                console.error("¡ERROR DE DOM! No se encontraron los elementos del header.");
                console.error("Asegúrate de que 'artist.html' tiene los IDs: artistCover, artistName");
                return; 
        }
        coverEl.src = artist.imagen || './../Assets/default-avatar.png';
        nameEl.textContent = artist.name;
        
        
        console.log("--- renderArtistHeader completado ---");
        }

        function  renderTopTracks(tracks)  {
        const  listEl  =  document.getElementById('songList');
                if  (!listEl)  return;
        listEl.innerHTML  =  tracks.map((track,  index)  =>  createSongListItem({
                ...track,  
                artistName:  ""  
        },  index)).join('');
        }

        function renderAlbums(albums) {
        const listEl = document.getElementById('albumList');
        if (!listEl) return;

        if (!albums || albums.length === 0) {
                listEl.innerHTML = '<li class="text-light text-center p-3">Este artista no tiene álbumes registrados.</li>';
                return;
                }

        listEl.innerHTML = albums.map((album, index) => createAlbumListItem(album, index)).join('');
        }

        function renderArtistDetails(artist) {
                const stageNameEl = document.getElementById('detailStageName');
                if (stageNameEl) {
                        stageNameEl.textContent = artist.name || '-';
                }


                const idsToHide = ['detailRealName', 'detailGenre', 'detailBirthDate'];

                idsToHide.forEach(id => {
                        const element = document.getElementById(id);
                        if (element) {

                        if (element.parentElement) {
                                element.parentElement.style.display = 'none';
                        } else {
                                element.style.display = 'none';
                        }
                        }
                });
                }