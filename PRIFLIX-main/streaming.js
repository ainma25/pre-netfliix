// Streaming Page JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // Initialize streaming page
    initStreamingPage();
});

// Initialize streaming page
async function initStreamingPage() {
    try {
        // Restore the current content from sessionStorage
        const contentData = sessionStorage.getItem('currentContent');
        if (contentData) {
            window.currentContent = JSON.parse(contentData);
        }
        
        // Get URL parameters
        const params = getQueryParams();
        
        // Update meta tags with query parameters
        updateMetaTags(params);
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup content details
        await setupContentDetails(params);
        
        // Fetch and display content
        await fetchAndDisplayContent(params);
    } catch (error) {
        console.error('Error initializing streaming page:', error);
        showErrorMessage('There was an error loading the content. Please try again later.');
    }
}

// Get URL parameters
function getQueryParams() {
    const searchParams = new URLSearchParams(window.location.search);
    return {
        folderId: searchParams.get('folderId'),
        title: searchParams.get('title'),
        type: searchParams.get('type') || 'Movie',
        videoUrl: searchParams.get('videoUrl'),
        imageUrl: searchParams.get('imageUrl'),
        tmdbId: searchParams.get('tmdbId'),
        episodeId: searchParams.get('episodeId'),
        episodeTitle: searchParams.get('episodeTitle')
    };
}

// Update meta tags
function updateMetaTags(params) {
    document.title = params.title ? `${params.title} - Pariflix` : 'Pariflix';
    
    const folderIdMeta = document.getElementById('folderid');
    const titleMeta = document.getElementById('title');
    const tmdbIdMeta = document.getElementById('tmdbid');
    const contentTypeMeta = document.getElementById('content-type');
    
    if (folderIdMeta) folderIdMeta.content = params.folderId || '';
    if (titleMeta) titleMeta.content = params.title || '';
    if (tmdbIdMeta) tmdbIdMeta.content = params.tmdbId || '';
    if (contentTypeMeta) contentTypeMeta.content = params.type || 'movie';
}

// Setup event listeners
function setupEventListeners() {
    const prevButton = document.getElementById('prevEpisodeBtn');
    const nextButton = document.getElementById('nextEpisodeBtn');
    const addToListBtn = document.getElementById('addToListBtn');
    
    // Previous episode button
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            playPreviousEpisode();
        });
    }
    
    // Next episode button
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            playNextEpisode();
        });
    }
    
    // Add to list button
    if (addToListBtn) {
        addToListBtn.addEventListener('click', () => {
            const params = getQueryParams();
            toggleAddToList(params);
        });
    }
    
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            const nav = document.querySelector('.main-nav');
            nav.style.display = nav.style.display === 'block' ? 'none' : 'block';
        });
    }
    
    // Search functionality
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            const searchContainer = document.querySelector('.search-container');
            searchContainer.classList.toggle('active');
            searchInput.focus();
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.location.href = `index.html?search=${searchInput.value}`;
            }
        });
    }
    
    // Handle scroll for navbar
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Handle sticky video player for mobile devices
        if (window.innerWidth <= 768) {
            const videoSection = document.querySelector('.video-section');
            const videoContainer = document.querySelector('.video-container');
            const videoControls = document.querySelector('.video-controls');
            const videoSectionHeight = videoSection.offsetHeight;
            
            if (window.scrollY > videoSectionHeight && !videoSection.dataset.minimized) {
                videoSection.classList.add('sticky');
                videoContainer.classList.add('sticky');
                videoControls.classList.add('sticky');
                document.body.classList.add('has-sticky-video');
                
                // Add event listener to close button
                videoSection.addEventListener('click', function(e) {
                    // Check if we clicked on the ::after pseudo-element (close button)
                    // We can approximate this by checking click position relative to element
                    const rect = videoSection.getBoundingClientRect();
                    if (e.clientX > rect.right - 30 && e.clientY < rect.top + 30) {
                        videoSection.dataset.minimized = 'true';
                        videoSection.classList.remove('sticky');
                        videoContainer.classList.remove('sticky');
                        videoControls.classList.remove('sticky');
                        document.body.classList.remove('has-sticky-video');
                        e.stopPropagation();
                    }
                });
            } else if (window.scrollY <= videoSectionHeight) {
                videoSection.classList.remove('sticky');
                videoContainer.classList.remove('sticky');
                videoControls.classList.remove('sticky');
                document.body.classList.remove('has-sticky-video');
                // Reset minimized state when scrolling back to top
                videoSection.dataset.minimized = '';
            }
        }
    });
    
    // Update sticky player on resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            // Remove sticky classes on desktop
            const videoSection = document.querySelector('.video-section');
            const videoContainer = document.querySelector('.video-container');
            const videoControls = document.querySelector('.video-controls');
            
            if (videoSection) videoSection.classList.remove('sticky');
            if (videoContainer) videoContainer.classList.remove('sticky');
            if (videoControls) videoControls.classList.remove('sticky');
            document.body.classList.remove('has-sticky-video');
        }
    });
}

// Setup content details
async function setupContentDetails(params) {
    // Require title and either a folderId (Drive) or a videoUrl (local)
    if (!params.title || (!params.folderId && !params.videoUrl)) {
        showErrorMessage('Invalid content parameters. Please go back to the home page.');
        return;
    }

    // If this is Drive content, set Open in Drive link
    if (params.folderId) {
        const openInDriveBtn = document.getElementById('openInDriveBtn');
        if (openInDriveBtn) {
            openInDriveBtn.href = getDriveFolderUrl(params.folderId);
        }
    }
    
    // Update Add to List button state
    updateAddToListButton(params);
    
    // If this is local content, prefer local cast and basic content info
    if (window.currentContent?.origin === 'Local') {
        const fullContent = window.contentData?.find(item => item.title === params.title);
        if (fullContent) {
            // Update basic UI using local data
            updateBasicContentDetails(params.title, params.type);
            // If local custom cast exists, render it (replicates TMDB layout)
            if (fullContent.cast && Array.isArray(fullContent.cast)) {
                displayCustomCast(fullContent.cast);
            }
            return;
        }
    }

    // If we have a TMDB ID, fetch details from TMDB
    if (params.tmdbId) {
        const details = await fetchTMDBDetails(params.tmdbId, params.type);
        if (!details) {
            // If TMDB API is disabled or failed, use basic content details
            updateBasicContentDetails(params.title, params.type);
        } else {
            // Use TMDB details (this will update cast via updateCastSection)
            const tmdbType = CONFIG.TMDB_SEARCH_TYPES[params.type] || 'movie';
            updateContentDetailsUI(details, tmdbType);
            return;
        }
    }

    // Otherwise use the title to search TMDB
    const details = await searchAndFetchTMDBDetails(params.title, params.type);
    if (!details) {
        // If TMDB API is disabled or failed, use basic content details
        updateBasicContentDetails(params.title, params.type);
    }
}

// Fetch and display content
async function fetchAndDisplayContent(params) {
    try {
        console.log('fetchAndDisplayContent params:', params);
        // Set title in the UI
        document.getElementById('currentEpisodeTitle').textContent = params.episodeTitle || params.title;
        
        // FIRST: Check for local content (single file or episodes defined in content-data)
        if (window.currentContent?.origin === 'Local') {
            const fullContent = window.contentData?.find(item => item.title === params.title);
            if (fullContent) {
                // If local episodes array is provided, handle as a series
                if (Array.isArray(fullContent.episodes) && fullContent.episodes.length) {
                    await processLocalEpisodes(fullContent.episodes, params.title);
                    return;
                }
                // Otherwise if a direct video URL/localPath was provided in params or content, play it
                const localUrl = params.videoUrl || fullContent.localPath;
                if (localUrl) {
                    console.log('Playing local video:', localUrl);
                    playLocalVideo(localUrl, params.title || 'Video');
                    const episodesSection = document.getElementById('episodes');
                    if (episodesSection) episodesSection.style.display = 'none';
                    return;
                }
            }
        }
        
        // SECOND: If we have a specific episode ID, play that episode
        if (params.episodeId) {
            playVideo(params.episodeId, params.episodeTitle || 'Episode');
            await fetchEpisodesList(params.folderId, params.episodeId);
        } else {
            // THIRD: Otherwise fetch all files from the folder
            const files = await fetchFilesFromDrive(params.folderId);
            
            if (files.length === 0) {
                showErrorMessage('No files found in this folder.');
                return;
            }
            
            // If this is a movie (single file expected)
            if (params.type === 'Movie' || params.type === 'Cartoon movies') {
                const videoFile = files.find(file => file.mimeType && file.mimeType.includes('video'));
                if (videoFile) {
                    playVideo(videoFile.id, params.title);
                    // Hide episodes section for movies
                    const episodesSection = document.getElementById('episodes');
                    if (episodesSection) episodesSection.style.display = 'none';
                } else {
                    showErrorMessage('No video files found in this folder.');
                }
            } else {
                // For series, show episode list
                await processEpisodes(files, params.folderId);
                
                // Show next season content if available
                await displayNextSeasonContent(params);
            }
        }
    } catch (error) {
        console.error('Error fetching content:', error);
        showErrorMessage('Failed to load content. Please try again later.');
    }
}

// Play video in the player
function playVideo(fileId, title) {
    const videoPlayer = document.getElementById('videoPlayer');
    if (!videoPlayer) return;
    
    // Clear existing content
    videoPlayer.innerHTML = '';
    
    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = getDriveEmbedUrl(fileId);
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', 'true');
    
    // Add iframe to player
    videoPlayer.appendChild(iframe);
    
    // Update episode title and info
    updateEpisodeInfo(fileId, title);
    
    // Add folder redirect button below video container
    const videoControls = document.querySelector('.video-controls');
    if (videoControls) {
        // Remove existing folder button if it exists
        const existingBtn = videoControls.querySelector('.folder-btn');
        if (existingBtn) {
            existingBtn.remove();
        }
        
        const params = getQueryParams();
        const folderBtn = document.createElement('a');
        folderBtn.href = getDriveFolderUrl(params.folderId);
        folderBtn.target = '_blank';
        folderBtn.className = 'folder-btn';
        folderBtn.innerHTML = '<i class="fas fa-folder-open"></i> Open in Google Drive';
        
        // Insert after episode info but before control buttons
        const episodeInfo = videoControls.querySelector('.episode-info');
        if (episodeInfo) {
            episodeInfo.insertAdjacentElement('afterend', folderBtn);
        } else {
            videoControls.insertBefore(folderBtn, videoControls.firstChild);
        }
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Play a local or project-relative video using an HTML5 player
function playLocalVideo(url, title) {
    const videoPlayer = document.getElementById('videoPlayer');
    console.log('playLocalVideo called with:', { url, title, videoPlayerExists: !!videoPlayer });
    if (!videoPlayer) {
        console.error('videoPlayer element not found!');
        return;
    }

    // Clear existing content
    videoPlayer.innerHTML = '';
    videoPlayer.style.position = 'relative';
    videoPlayer.style.width = '100%';
    videoPlayer.style.height = 'auto';
    videoPlayer.style.backgroundColor = '#000';
    videoPlayer.style.overflow = 'hidden';
    videoPlayer.style.paddingBottom = '0';

    // Create video element
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.style.width = '100%';
    video.style.height = 'auto';
    video.style.display = 'block';
    video.style.maxWidth = '100%';
    video.style.margin = '0 auto';

    console.log('Created video element, about to add source');

    // Use the provided URL (relative or absolute). For user-selected File objects, caller should pass an object URL.
    const source = document.createElement('source');
    source.src = url;
    // Attempt to set a common MIME type based on extension to help the browser
    const ext = url.split('.').pop().toLowerCase().split(/[?#]/)[0];
    if (ext === 'mp4') source.type = 'video/mp4';
    else if (ext === 'mov') source.type = 'video/quicktime';
    else if (ext === 'webm') source.type = 'video/webm';
    else if (ext === 'ogg' || ext === 'ogv') source.type = 'video/ogg';
    
    console.log('Source details:', { src: url, type: source.type, ext });
    video.appendChild(source);
    // Also set video.src as a fallback (some browsers handle this more directly)
    try { video.src = url; } catch (e) { /* ignore */ }

    // Add error handlers to surface useful messages in console/UI
    video.addEventListener('error', (ev) => {
        console.error('Video element error:', ev);
        showErrorMessage('Unable to play the video. Check console/Network for details.');
    });
    source.addEventListener('error', (ev) => {
        console.error('Source load error for', url, ev);
    });

    // Fallback text
    const fallback = document.createElement('div');
    fallback.className = 'video-fallback-text';
    fallback.textContent = 'Your browser does not support the video tag.';

    videoPlayer.appendChild(video);
    videoPlayer.appendChild(fallback);

    console.log('Video and fallback appended to DOM');
    console.log('Video element in DOM:', videoPlayer.querySelector('video'));
    console.log('videoPlayer HTML:', videoPlayer.innerHTML.substring(0, 200));

    // Update episode/title info
    updateEpisodeInfo(url, title);

    // Diagnostic events: metadata, canplay, error
    video.addEventListener('loadedmetadata', () => {
        console.log('Video metadata loaded:', { width: video.videoWidth, height: video.videoHeight, duration: video.duration });
        
        // Remove fallback if present
        if (fallback && fallback.parentNode) {
            fallback.parentNode.removeChild(fallback);
        }
        
        // If videoWidth or height is 0, browser cannot decode video track
        if (!video.videoWidth || !video.videoHeight) {
            showErrorMessage('Video track could not be decoded by your browser (audio may still play). Try re-encoding the file to H.264 + AAC.');
            const diag = document.createElement('div');
            diag.className = 'video-diagnostic';
            diag.style.color = '#f88';
            diag.style.marginTop = '10px';
            diag.textContent = `Detected video size: ${video.videoWidth}x${video.videoHeight} — codec may be unsupported.`;
            videoPlayer.appendChild(diag);
        }
        // Update duration for local episode if we have one
        try {
            const durationInSeconds = Math.floor(video.duration || 0);
            const episodes = window.currentEpisodes || [];
            const idx = window.currentEpisodeIndex || 0;
            if (episodes[idx]) {
                episodes[idx].duration = durationInSeconds;
                // Update any episode card duration element
                const card = document.querySelector(`.episode-card[data-id="${episodes[idx].id}"]`) || document.querySelectorAll('.episode-card')[idx];
                if (card) {
                    const durEl = card.querySelector('.episode-duration');
                    if (durEl) durEl.textContent = formatDuration(durationInSeconds);
                }
            }
        } catch (e) {
            // ignore
        }
    });

    video.addEventListener('canplay', () => {
        console.log('Video canplay event — playback should be visible.');
        if (fallback && fallback.parentNode) fallback.parentNode.removeChild(fallback);
    });

    video.addEventListener('error', (ev) => {
        const err = video.error;
        console.error('Video playback error code:', err && err.code, ev);
        showErrorMessage('Unable to play the video. See console for details.');
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update episode info when playing
function updateEpisodeInfo(fileId, title) {
    const episodeTitle = document.getElementById('currentEpisodeTitle');
    if (!episodeTitle) return;
    
    // Get content title from meta tags
    const contentTitleMeta = document.getElementById('title');
    const contentTitle = contentTitleMeta ? contentTitleMeta.content : '';
    
    // Find full episode data if available
    const episodes = window.currentEpisodes || [];
    const episode = episodes.find(ep => ep.id === fileId);
    
    if (episode && episode.tmdbData) {
        // Create detailed episode info with TMDB data
        const episodeInfo = document.createElement('div');
        episodeInfo.className = 'detailed-episode-info';
        
        let airDateDisplay = '';
        if (episode.air_date) {
            const airDate = new Date(episode.air_date);
            airDateDisplay = airDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        }
        
        // Create rating stars
        const rating = episode.vote_average || 0;
        const fullStars = Math.floor(rating / 2);
        const halfStar = rating % 2 >= 1;
        let starsHTML = '';
        
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                starsHTML += '<i class="fas fa-star"></i>';
            } else if (i === fullStars && halfStar) {
                starsHTML += '<i class="fas fa-star-half-alt"></i>';
            } else {
                starsHTML += '<i class="far fa-star"></i>';
            }
        }
        
        // Format title with show name and episode number
        const formattedTitle = episode.episodeNumber ? 
            `${contentTitle} S${episode.seasonNumber}:E${episode.episodeNumber}` : 
            contentTitle;
            
        episodeInfo.innerHTML = `
            <div class="episode-title">${formattedTitle}</div>
            <div class="episode-subtitle">${episode.title}</div>
            <div class="episode-meta">
                ${airDateDisplay ? `<span class="air-date">${airDateDisplay}</span>` : ''}
                ${rating ? `<span class="rating">${starsHTML} ${rating.toFixed(1)}</span>` : ''}
            </div>
            ${episode.overview ? `<div class="episode-overview">${episode.overview}</div>` : ''}
        `;
        
        // Replace the current episode title with detailed info
        episodeTitle.innerHTML = '';
        episodeTitle.appendChild(episodeInfo);
    } else if (episode) {
        // For non-TMDB episodes, still format nicely
        const formattedTitle = episode.episodeNumber ? 
            `${contentTitle} S${episode.seasonNumber}:E${episode.episodeNumber}` : 
            contentTitle;
        
        episodeTitle.textContent = formattedTitle;
    } else {
        // Clean up the title by removing quality and encoding info
        let cleanTitle = title || 'Playing';
        
        // Only process if it's not already cleaned
        if (cleanTitle !== 'Playing') {
            cleanTitle = cleanTitle
                // Remove quality and encoding info
                .replace(/\b(480p|720p|1080p|2160p|BluRay|WEB-DL|WEBRip|HDRip|BRRip|DVDRip)\b/ig, '')
                .replace(/\b(HEVC|x265|x264|10bit|8bit|AC3|AAC|DTS|DDP|Atmos|5\.1|2\.0|Dual|Multi)\b/ig, '')
                .replace(/\b(ESub|mkvCinemas|RARBG|YIFY|YTS|SPARKS|GECKOS|FGT|AMZN|DSNP|NF)\b/ig, '')
                // Remove language indicators
                .replace(/\b(Hindi|English|Japanese|Korean|Tamil|Telugu|Dual Audio|Multi Audio)\b/ig, '')
                .replace(/\[(.*?)\]/g, '') // Remove content in square brackets which often contains language info
                .replace(/\((.*?)\)/g, '') // Remove content in parentheses which often contains language info
                .replace(/[-_.]/g, ' ') // Replace separators with spaces
                .replace(/\s{2,}/g, ' ') // Remove double spaces
                .trim();
        }
        
        // Fallback to cleaned title
        episodeTitle.textContent = cleanTitle;
    }
}

// Fetch files from Google Drive
async function fetchFilesFromDrive(folderId) {
    if (!folderId) return [];
    
    try {
        const apiUrl = getDriveAPIUrl(folderId);
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.files || data.files.length === 0) {
            console.warn("No files found in the folder.");
            return [];
        }
        
        return data.files;
    } catch (error) {
        console.error('Error fetching files from Drive:', error);
        return [];
    }
}

// Process episodes for series
async function processEpisodes(files, folderId) {
    // Filter video files
    const videoFiles = files.filter(file => file.mimeType && file.mimeType.includes('video'));
    
    if (videoFiles.length === 0) {
        showErrorMessage('No video files found in this folder.');
        return;
    }
    
    // Process episodes
    const episodes = processEpisodeFiles(videoFiles);
    
    // Store episodes in window for navigation
    window.currentEpisodes = episodes;
    window.currentEpisodeIndex = 0;
    
    // Play the first episode
    if (episodes.length > 0) {
        playVideo(episodes[0].id, episodes[0].title);
    }
    
    // Get TMDB info for episodes if available
    await enhanceEpisodesWithTMDB(episodes);
    
    // Display episodes list
    displayEpisodesList(episodes, folderId);
    
    // Update navigation buttons
    updateNavigationButtons();
}

// Process local episodes provided in `content-data.js`
async function processLocalEpisodes(episodesArray, title) {
    if (!Array.isArray(episodesArray) || episodesArray.length === 0) {
        showErrorMessage('No local episodes found.');
        return;
    }

    // Normalize to the same shape used by drive-processed episodes
    const episodes = episodesArray.map((e, idx) => ({
        id: e.id || `local-${idx + 1}`,
        name: e.title || e.name || (e.localPath ? e.localPath.split('/').pop() : `Episode ${idx + 1}`),
        title: e.title || `Episode ${e.episodeNumber || idx + 1}`,
        seasonNumber: e.seasonNumber || 1,
        episodeNumber: e.episodeNumber || (idx + 1),
        still_path: null,
        overview: e.overview || null,
        thumbnailLink: e.image || null,
        duration: e.duration || null,
        localPath: e.localPath || null
    }));

    // Store episodes in window for navigation
    window.currentEpisodes = episodes;
    window.currentEpisodeIndex = 0;

    // Play the first episode (local)
    if (episodes.length > 0) {
        const first = episodes[0];
        if (first.localPath) {
            playLocalVideo(first.localPath, first.title);
        } else {
            // fallback: if no localPath, but id points to Drive, try playVideo
            playVideo(first.id, first.title);
        }
    }

    // Display episodes list using the existing renderer to ensure consistent layout
    displayEpisodesList(episodes, null);
    updateNavigationButtons();
}

// Process episode files
function processEpisodeFiles(files) {
    // Extract episode information
    const processedFiles = files.map(file => {
        // Try to extract episode number from filename using multiple patterns
        let episodeNumber = null;
        const patterns = [
            /E(\d+)/i,                    // Matches E01, E1, etc.
            /Episode\s*(\d+)/i,           // Matches Episode 1, Episode01, etc.
            /\b(\d+)\b/                   // Matches any standalone number
        ];

        for (const pattern of patterns) {
            const match = file.name.match(pattern);
            if (match) {
                episodeNumber = parseInt(match[1]);
                break;
            }
        }

        // Try to extract season number if present
        const seasonMatch = file.name.match(/S(\d+)/i);
        const seasonNumber = seasonMatch ? parseInt(seasonMatch[1]) : 1; // Default to season 1

        // Get content title from meta tags
        const contentTitleMeta = document.getElementById('title');
        const contentTitle = contentTitleMeta ? contentTitleMeta.content : '';

        // Generate a clean episode title
        let episodeTitle = '';

        // Remove extension and clean up filename for potential title
        const cleanName = file.name
            .replace(/\.[^.]+$/, '') // Remove file extension
            .replace(/\b(S\d+E\d+|Episode\s+\d+)\b/i, '') // Remove S01E01 or Episode 1 patterns
            .replace(contentTitle, '') // Remove show name if present
            .replace(/\s{2,}/g, ' ') // Remove double spaces
            // Remove quality and encoding info
            .replace(/\b(480p|720p|1080p|2160p|BluRay|WEB-DL|WEBRip|HDRip|BRRip|DVDRip)\b/ig, '')
            .replace(/\b(HEVC|x265|x264|10bit|8bit|AC3|AAC|DTS|DDP|Atmos|5\.1|2\.0|Dual|Multi)\b/ig, '')
            .replace(/\b(ESub|mkvCinemas|RARBG|YIFY|YTS|SPARKS|GECKOS|FGT|AMZN|DSNP|NF)\b/ig, '')
            // Remove language indicators
            .replace(/\b(Hindi|English|Japanese|Korean|Tamil|Telugu|Dual Audio|Multi Audio)\b/ig, '')
            .replace(/\[(.*?)\]/g, '') // Remove content in square brackets
            .replace(/\((.*?)\)/g, '') // Remove content in parentheses
            .replace(/[-_\.]/g, ' ') // Replace separators with spaces
            .replace(/\s{2,}/g, ' ') // Remove double spaces again after cleaning
            .trim();

        // If there's meaningful text left after cleaning, use it as episode title
        if (cleanName && cleanName !== '') {
            episodeTitle = cleanName;
        } else if (episodeNumber) {
            // Default to "Episode X" if we have a number but no title
            episodeTitle = `Episode ${episodeNumber}`;
        } else {
            // Last resort: use filename without extension
            episodeTitle = file.name.replace(/\.[^.]+$/, '');
        }

        // Ensure thumbnailLink is used if available
        const thumbnailLink = file.thumbnailLink || null;

        return {
            id: file.id,
            name: file.name,
            seasonNumber,
            episodeNumber,
            title: episodeTitle,
            still_path: null,
            overview: null,
            thumbnailLink: thumbnailLink,
            duration: null
        };
    });

    // Sort files by season number first, then episode number
    const sortedFiles = processedFiles.sort((a, b) => {
        // First sort by season
        if (a.seasonNumber !== b.seasonNumber) {
            return a.seasonNumber - b.seasonNumber;
        }
        
        // If episodes have numbers, sort by them
        if (a.episodeNumber !== null && b.episodeNumber !== null) {
            return a.episodeNumber - b.episodeNumber;
        }
        
        // If one has episode number and other doesn't, prioritize the one with number
        if (a.episodeNumber !== null) return -1;
        if (b.episodeNumber !== null) return 1;
        
        // If no episode numbers, sort by name
        return a.name.localeCompare(b.name);
    });

    return sortedFiles;
}

// Enhance episodes with TMDB data
async function enhanceEpisodesWithTMDB(episodes) {
    // Get TMDB ID from meta tag
    const tmdbIdMeta = document.getElementById('tmdbid');
    const tmdbId = tmdbIdMeta ? tmdbIdMeta.content : null;
    
    if (!tmdbId || episodes.length === 0) return;
    
    try {
        // Get content details to determine TV show name
        const contentType = document.getElementById('content-type').content;
        const tmdbType = CONFIG.TMDB_SEARCH_TYPES[contentType] || 'tv';
        
        // Only proceed for TV content
        if (tmdbType !== 'tv') return;
        
        // Get show details first to have show name for matching
        const showDetails = await getContentDetails(tmdbId, contentType);
        if (!showDetails) {
            // If TMDB API is disabled or failed, use basic episode details
            return;
        }
        
        const showName = showDetails.name || '';
        const cleanedShowName = cleanTitle(showName);
        
        // Determine if we have a season structure
        const distinctSeasons = [...new Set(episodes.map(ep => ep.seasonNumber))];
        
        // For each season, get the season details
        for (const seasonNumber of distinctSeasons) {
            const seasonDetails = await getTVSeasonDetails(tmdbId, seasonNumber);
            if (!seasonDetails || !seasonDetails.episodes) continue;
            
            // Match episodes by episode number
            episodes.forEach(episode => {
                if (episode.seasonNumber === seasonNumber && episode.episodeNumber) {
                    const tmdbEpisode = seasonDetails.episodes.find(e => e.episode_number === episode.episodeNumber);
                    if (tmdbEpisode) {
                        episode.title = tmdbEpisode.name || episode.title;
                        episode.still_path = tmdbEpisode.still_path;
                        episode.overview = tmdbEpisode.overview || '';
                        episode.air_date = tmdbEpisode.air_date;
                        episode.vote_average = tmdbEpisode.vote_average;
                        episode.tmdbData = true;
                    }
                }
            });
            
            // For files without clear episode numbers, try to match by name patterns
            const unmatched = episodes.filter(ep => ep.seasonNumber === seasonNumber && !ep.tmdbData);
            if (unmatched.length > 0) {
                unmatched.forEach(episode => {
                    // Try to match by cleaning up the filename and comparing with episode titles
                    const cleanName = episode.name
                        .replace(/\.[^.]+$/, '') // Remove file extension
                        .replace(/\b(S\d+E\d+|Episode\s+\d+)\b/i, '') // Remove S01E01 or Episode 1 patterns
                        .replace(showName, '') // Remove show name
                        .replace(cleanedShowName, '') // Remove cleaned show name
                        .replace(/^\s+|\s+$/g, '') // Trim whitespace
                        .replace(/[._-]/g, ' ') // Replace separators with spaces
                        .trim();
                    
                    // Try to find a matching episode by title similarity
                    const matchingEpisode = seasonDetails.episodes.find(e => {
                        const similarity = compareTitles(cleanName, e.name);
                        return similarity > 0.5; // 50% similarity threshold
                    });
                    
                    if (matchingEpisode) {
                        episode.title = matchingEpisode.name;
                        episode.still_path = matchingEpisode.still_path;
                        episode.overview = matchingEpisode.overview || '';
                        episode.air_date = matchingEpisode.air_date;
                        episode.vote_average = matchingEpisode.vote_average;
                        episode.episodeNumber = matchingEpisode.episode_number;
                        episode.tmdbData = true;
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error enhancing episodes with TMDB data:', error);
    }
}

// Simple function to compare title similarity (0-1 scale)
function compareTitles(title1, title2) {
    if (!title1 || !title2) return 0;
    
    // Convert to lowercase and remove special characters
    const clean1 = title1.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const clean2 = title2.toLowerCase().replace(/[^\w\s]/g, '').trim();
    
    if (clean1 === clean2) return 1;
    if (clean1.includes(clean2) || clean2.includes(clean1)) return 0.8;
    
    // Count matching words
    const word  = clean1.split(/\s+/);
    const words2 = clean2.split(/\s+/);
    
    let matchCount = 0;
    word .forEach(word => {
        if (words2.includes(word)) matchCount++;
    });
    
    const totalWords = Math.max(word .length, words2.length);
    return totalWords > 0 ? matchCount / totalWords : 0;
}

// Helper function to detect mobile devices
function isMobileDevice() {
    return window.innerWidth <= 768;
}

// Display episodes list
function displayEpisodesList(episodes, folderId) {
    const episodesContainer = document.getElementById('episodesContainer');
    if (!episodesContainer) return;
    
    // Clear loading spinner
    episodesContainer.innerHTML = '';
    
    if (episodes.length === 0) {
        episodesContainer.innerHTML = '<p class="no-results">No episodes found.</p>';
        return;
    }
    
    // Show skeleton loading
    const skeletonCount = Math.min(episodes.length, 6); // Show max 6 skeleton cards
    const loadingContainer = document.createElement('div');
    loadingContainer.className = 'loading-container';
    
    for (let i = 0; i < skeletonCount; i++) {
        const skeletonCard = document.createElement('div');
        skeletonCard.className = 'skeleton-episode-card';
        skeletonCard.innerHTML = `
            <div class="skeleton-thumbnail"></div>
            <div class="skeleton-info">
                <div class="skeleton-episode-number skeleton"></div>
                <div class="skeleton-title skeleton"></div>
                <div class="skeleton-description skeleton"></div>
                <div class="skeleton-description skeleton"></div>
            </div>
            <div class="skeleton-duration skeleton"></div>
        `;
        loadingContainer.appendChild(skeletonCard);
    }
    
    episodesContainer.appendChild(loadingContainer);
    
    // Get content title from meta tags
    const contentTitleMeta = document.getElementById('title');
    const contentTitle = contentTitleMeta ? contentTitleMeta.content : '';
    
    // Create episode cards
    const episodeCards = episodes.map((episode, index) => {
        const episodeCard = document.createElement('div');
        episodeCard.className = 'episode-card';
        episodeCard.dataset.id = episode.id;
        episodeCard.dataset.index = episode.episodeNumber || index + 1;
        
        // Format the episode title with show name and episode number
        const formattedTitle = episode.episodeNumber ? 
            `S${episode.seasonNumber}:E${episode.episodeNumber}` : 
            '';
        
        // Determine thumbnail source - don't load thumbnails on mobile
        let thumbnailHTML = '';
        let thumbnailSource = null;
        
        if (!isMobileDevice()) {
            if (episode.still_path) {
                // Use TMDB image if available
                thumbnailSource = getTMDBImageUrl(episode.still_path, CONFIG.TMDB_STILL_SIZE);
            } else if (episode.thumbnailLink) {
                // Use Google Drive thumbnail if available
                thumbnailSource = episode.thumbnailLink;
            }
        }
        
        if (thumbnailSource) {
            thumbnailHTML = `
                <img src="${thumbnailSource}" 
                     alt="${episode.title}" 
                     loading="lazy"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='none'; this.parentNode.insertAdjacentHTML('afterbegin', '<i class=\\'fas fa-play-circle\\'></i>');">
                <div class="thumbnail-overlay"></div>
            `;
        } else {
            // Otherwise use icon
            thumbnailHTML = '<i class="fas fa-play-circle"></i>';
        }
        
        // Always add time display element
        const timeDisplay = `<div class="episode-duration">${episode.duration ? formatDuration(episode.duration) : '--:--'}</div>`;
        
        // Determine episode description
        const description = episode.overview || `${episode.name}`;
        
        episodeCard.innerHTML = `
            <div class="episode-thumbnail">
                ${thumbnailHTML}
                ${timeDisplay}
            </div>
            <div class="episode-info">
                <div class="episode-header">
                    ${formattedTitle ? `<span class="episode-number">${formattedTitle}</span>` : ''}
                    <h3 class="episode-title">${episode.title}</h3>
                </div>
                ${episode.tmdbData ? `<div class="episode-rating"><i class="fas fa-star"></i> ${episode.vote_average?.toFixed(1) || 'N/A'}</div>` : ''}
                <p class="episode-description">${description}</p>
            </div>
        `;
        
        // Add click event to play the episode (supports Drive or local files)
        episodeCard.addEventListener('click', () => {
            window.currentEpisodeIndex = index;
            updateNavigationButtons();

            if (episode.localPath) {
                // Local file playback
                playLocalVideo(episode.localPath, episode.title);
            } else {
                // Drive playback
                playVideo(episode.id, episode.title);
            }

            // Update URL with episode info
            const params = getQueryParams();
            const url = new URL(window.location.href);
            url.searchParams.set('episodeId', episode.id);
            url.searchParams.set('episodeTitle', episode.title);
            window.history.replaceState({}, '', url);
        });
        
        return episodeCard;
    });
    
    // Replace skeleton loading with actual content after a short delay
    setTimeout(() => {
        episodesContainer.innerHTML = '';
        episodeCards.forEach(card => {
            episodesContainer.appendChild(card);
            // Load video duration for each card
            const episode = episodes.find(ep => ep.id === card.dataset.id);
            if (episode) {
                loadVideoDuration(episode, card);
            }
        });
    }, 500); // Short delay to show skeleton loading
}

// Helper function to format duration in HH:MM:SS or MM:SS format
function formatDuration(seconds) {
    if (!seconds) return '--:--';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// Helper function to load video duration
function loadVideoDuration(episode, episodeCard) {
    // For Google Drive, fetch video metadata to get duration
    const durationElement = episodeCard.querySelector('.episode-duration');
    
    try {
        // Use Google Drive API to get video metadata
        // Need scope https://www.googleapis.com/auth/drive.metadata.readonly
        fetch(`https://www.googleapis.com/drive/v3/files/${episode.id}?fields=videoMediaMetadata,thumbnailLink&supportsAllDrives=true&key=${CONFIG.DRIVE_API_KEY}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error fetching video metadata: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Update thumbnail if we got a better one and current one is missing
                if (!episode.still_path && data.thumbnailLink && !episode.thumbnailLink) {
                    episode.thumbnailLink = data.thumbnailLink;
                    const thumbnailContainer = episodeCard.querySelector('.episode-thumbnail');
                    if (thumbnailContainer && thumbnailContainer.querySelector('i')) {
                        // Save the current duration element text if it exists
                        const durationText = durationElement ? durationElement.textContent : '--:--';
                        
                        // Replace the icon with the thumbnail but preserve the duration
                        thumbnailContainer.innerHTML = `
                            <img src="${data.thumbnailLink}" 
                                 alt="${episode.title}"
                                 loading="lazy" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='none'; this.parentNode.insertAdjacentHTML('afterbegin', '<i class=\\'fas fa-play-circle\\'></i>');">
                            <div class="thumbnail-overlay"></div>
                            <div class="episode-duration">${durationText}</div>
                        `;
                    }
                }
                
                // Update duration if available
                if (data && data.videoMediaMetadata && data.videoMediaMetadata.durationMillis) {
                    const durationInSeconds = Math.floor(data.videoMediaMetadata.durationMillis / 1000);
                    episode.duration = durationInSeconds;
                    
                    // Find the duration element again
                    const updatedDurationElement = episodeCard.querySelector('.episode-duration');
                    if (updatedDurationElement) {
                        updatedDurationElement.textContent = formatDuration(durationInSeconds);
                    } else {
                        // If no duration element exists, add one
                        const thumbnailContainer = episodeCard.querySelector('.episode-thumbnail');
                        if (thumbnailContainer) {
                            thumbnailContainer.insertAdjacentHTML('beforeend', 
                                `<div class="episode-duration">${formatDuration(durationInSeconds)}</div>`);
                        }
                    }
                }
            })
            .catch(error => {
                console.warn('Could not fetch video metadata from Drive API:', error);
                // Ensure duration element exists if it doesn't already
                if (!episodeCard.querySelector('.episode-duration')) {
                    const thumbnailContainer = episodeCard.querySelector('.episode-thumbnail');
                    if (thumbnailContainer) {
                        thumbnailContainer.insertAdjacentHTML('beforeend', '<div class="episode-duration">--:--</div>');
                    }
                }
            });
    } catch (error) {
        console.warn('Error attempting to get video metadata:', error);
        // Ensure duration element exists if it doesn't already
        if (!episodeCard.querySelector('.episode-duration')) {
            const thumbnailContainer = episodeCard.querySelector('.episode-thumbnail');
            if (thumbnailContainer) {
                thumbnailContainer.insertAdjacentHTML('beforeend', '<div class="episode-duration">--:--</div>');
            }
        }
    }
}

// Update navigation buttons
function updateNavigationButtons() {
    const prevButton = document.getElementById('prevEpisodeBtn');
    const nextButton = document.getElementById('nextEpisodeBtn');
    
    if (!prevButton || !nextButton) return;
    
    const episodes = window.currentEpisodes || [];
    const currentIndex = window.currentEpisodeIndex || 0;
    
    // Update previous button
    prevButton.disabled = currentIndex <= 0;
    
    // Update next button
    nextButton.disabled = currentIndex >= episodes.length - 1;
}

// Play previous episode
function playPreviousEpisode() {
    const episodes = window.currentEpisodes || [];
    const currentIndex = window.currentEpisodeIndex || 0;
    
    if (currentIndex > 0) {
        const prevEpisode = episodes[currentIndex - 1];
        // Use local playback when available
        if (prevEpisode.localPath) {
            playLocalVideo(prevEpisode.localPath, prevEpisode.title);
        } else {
            playVideo(prevEpisode.id, prevEpisode.title);
        }
        window.currentEpisodeIndex = currentIndex - 1;
        updateNavigationButtons();

        // Update URL with episode info
        const url = new URL(window.location.href);
        url.searchParams.set('episodeId', prevEpisode.id);
        url.searchParams.set('episodeTitle', prevEpisode.title);
        window.history.replaceState({}, '', url);
    }
}

// Play next episode
function playNextEpisode() {
    const episodes = window.currentEpisodes || [];
    const currentIndex = window.currentEpisodeIndex || 0;
    
    if (currentIndex < episodes.length - 1) {
        const nextEpisode = episodes[currentIndex + 1];
        if (nextEpisode.localPath) {
            playLocalVideo(nextEpisode.localPath, nextEpisode.title);
        } else {
            playVideo(nextEpisode.id, nextEpisode.title);
        }
        window.currentEpisodeIndex = currentIndex + 1;
        updateNavigationButtons();

        // Update URL with episode info
        const url = new URL(window.location.href);
        url.searchParams.set('episodeId', nextEpisode.id);
        url.searchParams.set('episodeTitle', nextEpisode.title);
        window.history.replaceState({}, '', url);
    }
}

// Fetch episodes list for direct episode playback
async function fetchEpisodesList(folderId, currentEpisodeId) {
    const files = await fetchFilesFromDrive(folderId);
    const videoFiles = files.filter(file => file.mimeType && file.mimeType.includes('video'));
    
    if (videoFiles.length === 0) {
        const episodesSection = document.getElementById('episodes');
        if (episodesSection) episodesSection.style.display = 'none';
        return;
    }
    
    const episodes = processEpisodeFiles(videoFiles);
    
    // Get TMDB info for episodes if available
    await enhanceEpisodesWithTMDB(episodes);
    
    // Store episodes in window for navigation
    window.currentEpisodes = episodes;
    
    // Find current episode index
    const currentIndex = episodes.findIndex(episode => episode.id === currentEpisodeId);
    window.currentEpisodeIndex = currentIndex !== -1 ? currentIndex : 0;
    
    // Display episodes list
    displayEpisodesList(episodes, folderId);
    
    // Update navigation buttons
    updateNavigationButtons();
}

// Search TMDB and fetch details
async function searchAndFetchTMDBDetails(title, contentType) {
    try {
        // Clean the title by removing text in parentheses
        const cleanedTitle = cleanTitle(title);
        
        // Search for the content on TMDB using cleaned title
        const searchResult = await searchTMDB(cleanedTitle, contentType);
        
        if (!searchResult) {
            // If TMDB API is disabled or no results, use basic content details
            updateBasicContentDetails(title, contentType);
            return null;
        }
        
        // Store TMDB ID in URL parameters
        const url = new URL(window.location.href);
        url.searchParams.set('tmdbId', searchResult.id);
        window.history.replaceState({}, '', url);
        
        // Update meta tag
        const tmdbIdMeta = document.getElementById('tmdbid');
        if (tmdbIdMeta) tmdbIdMeta.content = searchResult.id;
        
        // Fetch full details
        const tmdbType = CONFIG.TMDB_SEARCH_TYPES[contentType] || 'movie';
        const details = await getContentDetails(searchResult.id, contentType);
        
        if (details) {
            updateContentDetailsUI(details, tmdbType);
            return details;
        } else {
            updateBasicContentDetails(title, contentType);
            return null;
        }
    } catch (error) {
        console.error('Error searching TMDB:', error);
        updateBasicContentDetails(title, contentType);
        return null;
    }
}

// Fetch TMDB details using ID
async function fetchTMDBDetails(tmdbId, contentType) {
    try {
        if (!tmdbId) return null;
        
        const details = await getContentDetails(tmdbId, contentType);
        
        if (details) {
            const tmdbType = CONFIG.TMDB_SEARCH_TYPES[contentType] || 'movie';
            updateContentDetailsUI(details, tmdbType);
            return details;
        }
        return null;
    } catch (error) {
        console.error('Error fetching TMDB details:', error);
        
        // Use basic content details as fallback
        const params = getQueryParams();
        updateBasicContentDetails(params.title, params.type);
        return null;
    }
}

// Update content details UI with TMDB data
function updateContentDetailsUI(details, contentType) {
    // Update title
    const contentTitle = document.getElementById('contentTitle');
    if (contentTitle) {
        contentTitle.textContent = details.title || details.name || 'Unknown Title';
    }
    
    // Update metadata
    const contentYear = document.getElementById('contentYear');
    if (contentYear) {
        const releaseDate = details.release_date || details.first_air_date || '';
        contentYear.textContent = releaseDate ? releaseDate.substring(0, 4) : 'Unknown';
    }
    
    const contentRating = document.getElementById('contentRating');
    if (contentRating) {
        const rating = details.vote_average ? `${details.vote_average.toFixed(1)}/10` : 'N/A';
        contentRating.textContent = rating;
    }
    
    const contentRuntime = document.getElementById('contentRuntime');
    if (contentRuntime) {
        let runtime = '';
        if (contentType === 'movie' && details.runtime) {
            const hours = Math.floor(details.runtime / 60);
            const minutes = details.runtime % 60;
            runtime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        } else if (details.episode_run_time && details.episode_run_time.length > 0) {
            const avgRuntime = details.episode_run_time[0];
            const hours = Math.floor(avgRuntime / 60);
            const minutes = avgRuntime % 60;
            runtime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        } else {
            runtime = 'N/A';
        }
        contentRuntime.textContent = runtime;
    }
    
    // Update overview
    const contentOverview = document.getElementById('contentOverview');
    if (contentOverview) {
        contentOverview.textContent = details.overview || 'No overview available.';
    }
    
    // Update poster
    const contentPoster = document.getElementById('contentPoster');
    if (contentPoster && details.poster_path) {
        contentPoster.src = getTMDBImageUrl(details.poster_path, CONFIG.TMDB_POSTER_SIZE);
        contentPoster.alt = details.title || details.name || 'Content Poster';
    }
    
    // Update backdrop
    const contentBackdrop = document.getElementById('contentBackdrop');
    if (contentBackdrop && details.backdrop_path) {
        contentBackdrop.style.backgroundImage = `url(${getTMDBImageUrl(details.backdrop_path, CONFIG.TMDB_BACKDROP_SIZE)})`;
    }
    
    // Update genres
    const contentGenres = document.getElementById('contentGenres');
    if (contentGenres && details.genres) {
        contentGenres.innerHTML = '';
        details.genres.forEach(genre => {
            const genreTag = document.createElement('span');
            genreTag.className = 'genre-tag';
            genreTag.textContent = genre.name;
            contentGenres.appendChild(genreTag);
        });
    }
    
    // Add download button to content actions
    const contentActions = document.querySelector('.content-actions');
    if (contentActions) {
        const params = getQueryParams();
        const downloadBtn = document.createElement('a');
        downloadBtn.href = getDriveFolderUrl(params.folderId);
        downloadBtn.target = '_blank';
        downloadBtn.className = 'action-btn download-btn';
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download';
        contentActions.appendChild(downloadBtn);
    }
    
    // Only update cast section if not on mobile
    if (!isMobileDevice()) {
        updateCastSection(details.credits?.cast);
    } else {
        // Hide cast section on mobile
        const castSection = document.querySelector('.cast-section');
        if (castSection) castSection.style.display = 'none';
    }
    
    // Update similar content
    updateSimilarContent(details.recommendations?.results, contentType);
}

// Display custom cast for specific titles
function displayCustomCast(castData) {
    const castSection = document.querySelector('.cast-section');
    if (!castSection) return;

    castSection.style.display = 'block';
    const castContainer = document.getElementById('castContainer');
    if (!castContainer) return;

    // Clear existing
    castContainer.innerHTML = '';

    if (!castData || !Array.isArray(castData) || castData.length === 0) {
        castSection.style.display = 'none';
        return;
    }

    // Fallback SVG (data URI) used when there is no network or no image available
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='138' height='175'><rect width='100%' height='100%' fill='%23222222'/><text x='50%' y='50%' fill='%23ffffff' font-size='14' font-family='Arial, Helvetica, sans-serif' dominant-baseline='middle' text-anchor='middle'>No Image</text></svg>`;
    const fallback = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);

    // Display top 10 local cast members to match TMDB layout
    const topCast = castData.slice(0, 10);

    topCast.forEach(member => {
        const castCard = document.createElement('div');
        castCard.className = 'cast-card';

        // Resolve image path: use the exact `contentData.cast.image` value and convert to absolute URL
        const rawSrc = member.image || '';
        let src;
        if (rawSrc) {
            try {
                if (/^https?:\/\//i.test(rawSrc) || /^\/\//.test(rawSrc)) {
                    src = rawSrc;
                } else {
                    // Convert relative path to absolute URL based on current location
                    src = new URL(rawSrc, window.location.href).href;
                }
            } catch (e) {
                src = rawSrc;
            }
        } else {
            src = fallback;
        }

        castCard.innerHTML = `
            <img src="${src}" alt="${member.name}" class="cast-photo" data-original="${member.image || ''}">
            <div class="cast-info">
                <div class="cast-name">${member.name}</div>
                <div class="cast-character">${member.character || ''}</div>
            </div>
        `;

        // Debug: log image src for DevTools troubleshooting (shows final request URL)
        try { console.debug('Render local cast image:', { name: member.name, requestedSrc: src, declaredInData: member.image }); } catch (e) {}

        // Attach onerror handler to replace with fallback if image load fails
        const img = castCard.querySelector('img');
        if (img) {
            img.onerror = function() {
                this.onerror = null;
                this.src = fallback;
            };
        }

        castContainer.appendChild(castCard);
    });
}

// Normalize local cast entries to TMDB-like cast objects
function normalizeCastForTMDB(castData) {
    if (!castData || !Array.isArray(castData)) return [];
    return castData.map((m, idx) => {
        // Prefer an existing profile_path, fall back to image, else empty string
        const profile_path = m.profile_path || m.image || '';
        return {
            id: m.id || -(idx + 1),
            name: m.name || m.person || 'Unknown',
            character: m.character || m.role || '',
            profile_path: profile_path
        };
    });
}

// Update basic content details when TMDB details not available
function updateBasicContentDetails(title, contentType) {
    // Update title
    const contentTitle = document.getElementById('contentTitle');
    if (contentTitle) {
        contentTitle.textContent = title || 'Unknown Title';
    }
    
    // Update overview
    const contentOverview = document.getElementById('contentOverview');
    if (contentOverview) {
        contentOverview.textContent = `${title} is available for streaming. Click play to start watching.`;
    }
    
    // Check if this is a local content and has cast data
    if (window.currentContent?.origin === 'Local') {
        // Look up the full content item from contentData
        const fullContent = window.contentData?.find(item => item.title === title);
        if (fullContent?.cast && Array.isArray(fullContent.cast)) {
            const normalized = normalizeCastForTMDB(fullContent.cast);
            updateCastSection(normalized);
            return;
        }
    }
    
    // Check if content has custom cast data stored
    if (window.currentContent?.cast && Array.isArray(window.currentContent.cast)) {
        const normalized = normalizeCastForTMDB(window.currentContent.cast);
        updateCastSection(normalized);
        return;
    }
    
    // Hide cast and similar sections
    const castSection = document.querySelector('.cast-section');
    if (castSection) castSection.style.display = 'none';
    
    const similarSection = document.querySelector('.similar-section');
    if (similarSection) similarSection.style.display = 'none';
}

// Update cast section
function updateCastSection(cast) {
    const castContainer = document.getElementById('castContainer');
    if (!castContainer) return;
    
    // Clear loading spinner
    castContainer.innerHTML = '';
    
    if (!cast || cast.length === 0) {
        const castSection = document.querySelector('.cast-section');
        if (castSection) castSection.style.display = 'none';
        return;
    }

    // Fallback SVG (data URI) used when there is no network or no image available
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='138' height='175'><rect width='100%' height='100%' fill='%23222222'/><text x='50%' y='50%' fill='%23ffffff' font-size='14' font-family='Arial, Helvetica, sans-serif' dominant-baseline='middle' text-anchor='middle'>No Image</text></svg>`;
    const fallback = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);

    // Display top 10 cast members
    const topCast = cast.slice(0, 10);

    topCast.forEach(actor => {
        const castCard = document.createElement('div');
        castCard.className = 'cast-card';

        // Determine image source (allow full URLs or TMDB paths)
        const src = actor.profile_path ? getTMDBImageUrl(actor.profile_path, CONFIG.TMDB_PROFILE_SIZE) : fallback;

        castCard.innerHTML = `
            <img src="${src}" 
                 alt="${actor.name}" 
                 class="cast-photo">
            <div class="cast-info">
                <div class="cast-name">${actor.name}</div>
                <div class="cast-character">${actor.character}</div>
            </div>
        `;

        // Attach onerror handler to replace with fallback if image load fails
        const img = castCard.querySelector('img');
        if (img) {
            img.onerror = function() {
                this.onerror = null;
                this.src = fallback;
            };
        }

        castContainer.appendChild(castCard);
    });
}

// Update similar content section
function updateSimilarContent(similar, contentType) {
    const similarContainer = document.getElementById('similarContainer');
    if (!similarContainer) return;
    
    // Clear loading spinner
    similarContainer.innerHTML = '';
    
    if (!similar || similar.length === 0) {
        const similarSection = document.querySelector('.similar-section');
        if (similarSection) similarSection.style.display = 'none';
        return;
    }
    
    // Display top 6 similar content
    const topSimilar = similar.slice(0, 6);
    
    topSimilar.forEach(item => {
        if (!item.poster_path) return; // Skip items without posters
        
        const similarCard = document.createElement('div');
        similarCard.className = 'similar-card';
        
        similarCard.innerHTML = `
            <img src="${getTMDBImageUrl(item.poster_path, 'w185')}" 
                 alt="${item.title || item.name}" 
                 class="similar-poster"
                 onerror="this.src='https://via.placeholder.com/185x278?text=No+Image'">
            <div class="similar-title">${item.title || item.name}</div>
        `;
        
        // Add click event
        similarCard.addEventListener('click', () => {
            // Redirect to similar content's detail page
            // Note: We'd need to find this content in our content-data.js to get the Google Drive folder ID
            // This is a placeholder for future implementation
            alert('This feature requires additional mapping between TMDB IDs and Google Drive folders.');
        });
        
        similarContainer.appendChild(similarCard);
    });
}

// Toggle add to My List
function toggleAddToList(params) {
    if (!params.folderId || !params.title) return;
    
    // Get existing list from localStorage
    let myList = JSON.parse(localStorage.getItem('myList')) || [];
    
    // Check if item is already in the list
    const isAlreadyInList = myList.some(item => item.folderid === params.folderId);
    
    if (isAlreadyInList) {
        // Remove from list
        myList = myList.filter(item => item.folderid !== params.folderId);
        localStorage.setItem('myList', JSON.stringify(myList));
        alert(`Removed "${params.title}" from My List`);
    } else {
        // Add to list
        myList.push({
            title: params.title,
            folderid: params.folderId,
            type: params.type,
            image: document.getElementById('contentPoster').src
        });
        localStorage.setItem('myList', JSON.stringify(myList));
        alert(`Added "${params.title}" to My List`);
    }
    
    // Update button text
    updateAddToListButton(params);
}

// Update Add to List button state
function updateAddToListButton(params) {
    const addToListBtn = document.getElementById('addToListBtn');
    if (!addToListBtn) return;
    
    // Get existing list from localStorage
    const myList = JSON.parse(localStorage.getItem('myList')) || [];
    
    // Check if item is already in the list
    const isAlreadyInList = myList.some(item => item.folderid === params.folderId);
    
    // Update button text
    addToListBtn.innerHTML = isAlreadyInList ? 
        '<i class="fas fa-check"></i> Remove from My List' : 
        '<i class="fas fa-plus"></i> Add to My List';
}

// Show error message
function showErrorMessage(message) {
    const contentTitle = document.getElementById('contentTitle');
    if (contentTitle) {
        contentTitle.textContent = 'Error';
    }
    
    const contentOverview = document.getElementById('contentOverview');
    if (contentOverview) {
        contentOverview.textContent = message;
    }
    
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer) {
        videoPlayer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
                <a href="index.html" class="action-btn">Back to Home</a>
            </div>
        `;
    }
    
    // Hide sections
    const episodesSection = document.getElementById('episodes');
    if (episodesSection) episodesSection.style.display = 'none';
    
    const castSection = document.querySelector('.cast-section');
    if (castSection) castSection.style.display = 'none';
    
    const similarSection = document.querySelector('.similar-section');
    if (similarSection) similarSection.style.display = 'none';
}

// Display next season content
async function displayNextSeasonContent(params) {
    try {
        // Get current season number from episodes
        const episodes = window.currentEpisodes || [];
        if (episodes.length === 0) return;
        
        // Find the highest season number
        const currentSeason = Math.max(...episodes.map(ep => ep.seasonNumber));
        
        // Search for content with the same name but different season
        const sameNameContent = contentData.filter(item => 
            item.title.toLowerCase() === params.title.toLowerCase() && 
            item.folderid !== params.folderId
        );
        
        if (sameNameContent.length === 0) return;
        
        // Create next season section
        const nextSeasonSection = document.createElement('section');
        nextSeasonSection.className = 'next-season-section';
        nextSeasonSection.innerHTML = `
            <h2>Next Season</h2>
            <div class="next-season-container" id="nextSeasonContainer">
                <div class="loading-spinner"></div>
            </div>
        `;
        
        // Insert after episodes section
        const episodesSection = document.getElementById('episodes');
        episodesSection.parentNode.insertBefore(nextSeasonSection, episodesSection.nextSibling);
        
        // Create content cards for next season
        const nextSeasonContainer = document.getElementById('nextSeasonContainer');
        nextSeasonContainer.innerHTML = '';
        
        sameNameContent.forEach(content => {
            const contentCard = document.createElement('div');
            contentCard.className = 'next-season-card';
            
            // Try to determine season number from folder name or content
            let seasonNumber = 'Next';
            const seasonMatch = content.folderid.match(/S(\d+)/i);
            if (seasonMatch) {
                const foundSeason = parseInt(seasonMatch[1]);
                if (foundSeason > currentSeason) {
                    seasonNumber = `Season ${foundSeason}`;
                }
            }
            
            contentCard.innerHTML = `
                <div class="next-season-poster">
                    <img src="${content.image || 'https://via.placeholder.com/300x450?text=No+Image'}" 
                         alt="${content.title}" 
                         loading="lazy">
                    <div class="next-season-overlay">
                        <button class="play-btn" data-folderid="${content.folderid}">
                            <i class="fas fa-play"></i>
                        </button>
                        <a href="${getDriveFolderUrl(content.folderid)}" 
                           class="download-btn" 
                           target="_blank">
                            <i class="fas fa-download"></i>
                        </a>
                    </div>
                </div>
            `;
            
            // Add click event to play button
            const playBtn = contentCard.querySelector('.play-btn');
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = `streaming.html?folderId=${content.folderid}&title=${encodeURIComponent(content.title)}&type=${content.type}`;
            });
            
            // Add click event to the entire card
            contentCard.addEventListener('click', () => {
                window.location.href = `streaming.html?folderId=${content.folderid}&title=${encodeURIComponent(content.title)}&type=${content.type}`;
            });
            
            nextSeasonContainer.appendChild(contentCard);
        });
        
        // Add slider navigation if there are multiple items
        if (sameNameContent.length > 1) {
            nextSeasonContainer.classList.add('slider');
            nextSeasonSection.innerHTML += `
                <button class="slider-nav left"><i class="fas fa-chevron-left"></i></button>
                <button class="slider-nav right"><i class="fas fa-chevron-right"></i></button>
            `;
            
            // Setup slider navigation
            setupNextSeasonSlider(nextSeasonContainer);
        }
    } catch (error) {
        console.error('Error displaying next season content:', error);
    }
}

// Setup next season slider navigation
function setupNextSeasonSlider(container) {
    const leftNav = container.parentElement.querySelector('.slider-nav.left');
    const rightNav = container.parentElement.querySelector('.slider-nav.right');
    
    if (leftNav) {
        leftNav.addEventListener('click', () => {
            container.scrollBy({
                left: -container.clientWidth,
                behavior: 'smooth'
            });
        });
    }
    
    if (rightNav) {
        rightNav.addEventListener('click', () => {
            container.scrollBy({
                left: container.clientWidth,
                behavior: 'smooth'
            });
        });
    }
    
    // Show/hide navigation buttons based on scroll position
    container.addEventListener('scroll', () => {
        if (leftNav) {
            leftNav.style.opacity = container.scrollLeft > 0 ? '1' : '0';
        }
        if (rightNav) {
            rightNav.style.opacity = 
                (container.scrollLeft + container.clientWidth) < container.scrollWidth ? '1' : '0';
        }
    });
    
    // Initial button visibility
    if (leftNav) leftNav.style.opacity = '0';
    if (rightNav) {
        rightNav.style.opacity = container.scrollWidth > container.clientWidth ? '1' : '0';
    }
} 