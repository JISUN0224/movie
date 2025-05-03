let player, subtitles = [], currentSubtitleIndex = -1;

// 시간 문자열 "00:01:23,456" → 초(float)로 변환
function timeStringToSeconds(timeStr) {
    const [hms, ms] = timeStr.split(',');
    const [h, m, s] = hms.split(':').map(Number);
    return h * 3600 + m * 60 + s + (parseInt(ms) || 0) / 1000;
}

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '390',
        width: '640',
        videoId: '',
        events: {
            'onReady': () => {
                document.getElementById('loadVideo').addEventListener('click', loadVideo);
            },
            'onStateChange': (e) => {
                if (e.data === YT.PlayerState.PLAYING) {
                    clearInterval(window.subtitleInterval);
                    window.subtitleInterval = setInterval(updateSubtitleHighlight, 100);
                } else {
                    clearInterval(window.subtitleInterval);
                }
            }
        }
    });
}

function loadVideo() {
    const videoId = document.getElementById('videoId').value;
    if (videoId) {
        player.loadVideoById(videoId);
        fetchSubtitles();
    }
}

async function fetchSubtitles() {
    try {
        const res = await fetch('merged_zh_ko_subtitles.json');
        const raw = await res.json();
        
        // 여기가 수정된 부분입니다 - text_cn과 text_kr을 모두 처리
        subtitles = raw.map(item => ({
            start: timeStringToSeconds(item.start_time),
            end: timeStringToSeconds(item.end_time),
            text_cn: item.text_cn || "",  // 값이 없을 경우 빈 문자열로 처리
            text_kr: item.text_kr || ""   // 값이 없을 경우 빈 문자열로 처리
        }));
        
        displaySubtitles();
    } catch (err) {
        console.error("자막 로드 오류:", err);
        document.getElementById('subtitles').innerHTML =
            "<div class='error'>자막 데이터를 불러오는 데 실패했습니다.</div>";
    }
}

function displaySubtitles() {
    const container = document.getElementById('subtitles');
    container.innerHTML = '';
    
    subtitles.forEach((sub, index) => {
        const div = document.createElement('div');
        div.className = 'subtitle-line';
        div.dataset.index = index;
        
        // 중국어와 한국어 자막을 모두 표시
        div.innerHTML = `
            <div class="cn-text">${sub.text_cn || ""}</div>
            <div class="kr-text">${sub.text_kr || ""}</div>
        `;
        
        container.appendChild(div);
    });
}

function updateSubtitleHighlight() {
    if (!player || !subtitles.length) return;
    
    const currentTime = player.getCurrentTime() + 5; // 동기화 보정
    
    subtitles.forEach((sub, index) => {
        const el = document.querySelector(`.subtitle-line[data-index='${index}']`);
        const nextStart = subtitles[index + 1]?.start ?? Infinity;
        
        if (!el) return;
        
        if (currentTime >= sub.start && currentTime < nextStart) {
            el.classList.add('highlight');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            el.classList.remove('highlight');
        }
    });
}
