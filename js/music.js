// 音乐播放器功能 - 使用网易云音乐API
(function() {
    'use strict';
    
    // 使用免费的网易云音乐API
    const API_BASE = 'https://api.injahow.cn/meting/';
    
    let playlist = []; // 播放列表
    let currentIndex = 0;
    let isPlaying = false;
    let audio = null;

    function init() {
        audio = document.getElementById('audio-player');
        bindEvents();
        loadRandomPlaylist();
    }

    function bindEvents() {
        // 开关播放器
        document.getElementById('btn-toggle-player')?.addEventListener('click', togglePlayer);
        document.getElementById('btn-close-player')?.addEventListener('click', closePlayer);

        // 播放控制
        document.getElementById('btn-play')?.addEventListener('click', togglePlay);
        document.getElementById('btn-prev')?.addEventListener('click', playPrev);
        document.getElementById('btn-next')?.addEventListener('click', playNext);

        // 进度条
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.addEventListener('click', seekTo);
        }

        // 音频事件
        if (audio) {
            audio.addEventListener('timeupdate', updateProgress);
            audio.addEventListener('ended', playNext);
            audio.addEventListener('loadedmetadata', updateDuration);
            audio.addEventListener('error', handleError);
            audio.addEventListener('play', () => {
                isPlaying = true;
                updatePlayButton();
            });
            audio.addEventListener('pause', () => {
                isPlaying = false;
                updatePlayButton();
            });
        }
    }

    // 加载随机播放列表
    async function loadRandomPlaylist() {
        try {
            // 使用热门歌单ID获取歌曲列表
            // 这里使用网易云音乐的热门歌单
            const playlistIds = [
                '3778678', // 热歌榜
                '19723756', // 飙升榜
                '3779629', // 新歌榜
                '2884035', // 云音乐说唱榜
                '991319590' // 热门华语
            ];
            
            const randomPlaylistId = playlistIds[Math.floor(Math.random() * playlistIds.length)];
            
            const response = await fetch(`${API_BASE}?server=netease&type=playlist&id=${randomPlaylistId}`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                // 随机打乱歌曲顺序
                playlist = data.sort(() => Math.random() - 0.5).slice(0, 50); // 取前50首
                currentIndex = 0;
                loadSong(currentIndex);
            } else {
                showToast('加载歌曲失败，请稍后重试', 'error');
            }
        } catch (error) {
            console.error('加载播放列表失败:', error);
            showToast('加载歌曲失败，请检查网络', 'error');
        }
    }

    // 加载歌曲
    function loadSong(index) {
        if (!playlist || playlist.length === 0) return;
        
        const song = playlist[index];
        if (!song) return;

        // 更新歌曲信息
        document.getElementById('song-name').textContent = song.name || '未知歌曲';
        document.getElementById('artist-name').textContent = song.artist || '未知歌手';
        
        // 加载专辑封面
        loadAlbumCover(song.pic || song.cover);

        // 加载音频
        audio.src = song.url;
        
        // 如果正在播放，自动播放下一首
        if (isPlaying) {
            audio.play().catch(err => {
                console.error('播放失败:', err);
                isPlaying = false;
                updatePlayButton();
            });
        }
    }

    // 切换播放/暂停
    function togglePlay() {
        if (!audio.src) {
            showToast('正在加载歌曲...', 'info');
            return;
        }

        if (isPlaying) {
            audio.pause();
            isPlaying = false;
            updatePlayButton();
        } else {
            audio.play().then(() => {
                isPlaying = true;
                updatePlayButton();
            }).catch(err => {
                console.error('播放失败:', err);
                showToast('播放失败，尝试下一首', 'error');
                playNext();
            });
        }
    }

    // 更新播放按钮
    function updatePlayButton() {
        const btnPlay = document.getElementById('btn-play');
        const vinyl = document.getElementById('vinyl-record');
        
        if (btnPlay) {
            btnPlay.textContent = isPlaying ? '⏸️' : '▶️';
        }
        
        // 控制黑胶唱片旋转
        if (vinyl) {
            if (isPlaying) {
                vinyl.classList.add('spinning');
            } else {
                vinyl.classList.remove('spinning');
            }
        }
    }

    // 上一首
    function playPrev() {
        currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        loadSong(currentIndex);
    }

    // 下一首
    function playNext() {
        currentIndex = (currentIndex + 1) % playlist.length;
        loadSong(currentIndex);
    }

    // 更新进度
    function updateProgress() {
        if (!audio.duration) return;
        
        const progress = (audio.currentTime / audio.duration) * 100;
        document.getElementById('progress-fill').style.width = progress + '%';
        
        // 更新时间显示
        document.getElementById('current-time').textContent = formatTime(audio.currentTime);
    }

    // 更新总时长
    function updateDuration() {
        document.getElementById('total-time').textContent = formatTime(audio.duration);
    }

    // 跳转到指定位置
    function seekTo(e) {
        if (!audio.duration) return;
        
        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audio.currentTime = percent * audio.duration;
    }

    // 格式化时间
    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // 处理错误
    function handleError(e) {
        console.error('音频加载错误:', e);
        showToast('歌曲加载失败，自动切换下一首', 'warning');
        setTimeout(() => {
            playNext();
        }, 1000);
    }

    // 显示/隐藏播放器
    function togglePlayer() {
        const player = document.getElementById('music-player');
        const toggleBtn = document.getElementById('btn-toggle-player');
        
        if (player.style.display === 'none') {
            player.style.display = 'block';
            toggleBtn.style.display = 'none';
        }
    }

    // 关闭播放器
    function closePlayer() {
        const player = document.getElementById('music-player');
        const toggleBtn = document.getElementById('btn-toggle-player');
        
        player.style.display = 'none';
        toggleBtn.style.display = 'block';
    }

    // 加载专辑封面
    function loadAlbumCover(coverUrl) {
        const albumCover = document.getElementById('album-cover');
        const vinylHole = document.querySelector('.vinyl-hole');
        
        if (!albumCover) return;
        
        if (coverUrl) {
            albumCover.src = coverUrl;
            albumCover.style.display = 'block';
            if (vinylHole) {
                vinylHole.style.display = 'none'; // 隐藏中心孔
            }
        } else {
            albumCover.style.display = 'none';
            if (vinylHole) {
                vinylHole.style.display = 'block'; // 显示中心孔
            }
        }
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
