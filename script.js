let player, subtitles = [], currentSubtitleIndex = -1;
const fixedVideoId = "K9LGQu3QnpU"; // 여기에 고정할 YouTube ID를 입력하세요
const DEFAULT_SYNC_OFFSET = 5; // 기본 싱크 오프셋 (초 단위)

// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', function() {
    // 입력란과 버튼 숨기기
    const controls = document.querySelector('.controls');
    if (controls) controls.style.display = 'none';
    
    // 발음 버튼 이벤트 리스너
    document.body.addEventListener('click', function(e) {
        if (e.target.id === 'pronunciation-btn' || e.target.closest('#pronunciation-btn')) {
            const word = document.getElementById('vocab-title').textContent;
            if (word) {
                speakChinese(word);
            }
        }
    });
    
    // 자막 싱크 조절 컨트롤 추가
    addSyncControls();
    
    // 자막 데이터 자동 로드
    fetchSubtitles();
});

// 자막 싱크 조절 컨트롤 추가
function addSyncControls() {
    const container = document.querySelector('.container');
    const syncControls = document.createElement('div');
    syncControls.className = 'sync-controls';
    syncControls.innerHTML = `
        <div class="sync-controls-container">
            <button id="sync-backward">◀ -1초</button>
            <span id="sync-status">자막 싱크: ${DEFAULT_SYNC_OFFSET}초</span>
            <button id="sync-forward">+1초 ▶</button>
        </div>
    `;
    
    // 메인 콘텐츠 영역 전에 추가
    const mainContent = document.querySelector('.main-content');
    container.insertBefore(syncControls, mainContent);
    
    // 싱크 조절 버튼 이벤트 리스너
    let syncOffset = DEFAULT_SYNC_OFFSET;
    document.getElementById('sync-backward').addEventListener('click', function() {
        syncOffset -= 1;
        updateSyncStatus(syncOffset);
    });
    
    document.getElementById('sync-forward').addEventListener('click', function() {
        syncOffset += 1;
        updateSyncStatus(syncOffset);
    });
}

// 싱크 상태 업데이트
function updateSyncStatus(offset) {
    document.getElementById('sync-status').textContent = `자막 싱크: ${offset}초`;
}

// 중국어 발음 재생 (Web Speech API 사용)
function speakChinese(text) {
    if ('speechSynthesis' in window) {
        // 음성 합성 객체 생성
        const utterance = new SpeechSynthesisUtterance(text);
        
        // 중국어(표준어)로 설정
        utterance.lang = 'zh-CN';
        
        // 음성 재생
        window.speechSynthesis.speak(utterance);
    } else {
        console.warn('이 브라우저는 음성 합성을 지원하지 않습니다.');
        alert('이 브라우저는 음성 합성을 지원하지 않습니다. 최신 Chrome, Firefox, Safari, Edge 등의 브라우저를 사용해주세요.');
    }
}

// 시간 문자열을 초 단위로 변환
function timeStringToSeconds(timeStr) {
    const [hms, ms] = timeStr.split(',');
    const [h, m, s] = hms.split(':').map(Number);
    return h * 3600 + m * 60 + s + (parseInt(ms) || 0) / 1000;
}

// YouTube API 준비 완료 시 호출
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '390',
        width: '640',
        videoId: fixedVideoId, // 고정 비디오 ID 사용
        playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1
        },
        events: {
            'onReady': () => {
                // 비디오 준비되면 자동으로 로드
                console.log('YouTube 플레이어 준비됨, 고정 비디오 ID:', fixedVideoId);
            },
            'onStateChange': (e) => {
                if (e.data === YT.PlayerState.PLAYING) {
                    // 재생 시 자막 하이라이트 업데이트 시작
                    clearInterval(window.subtitleInterval);
                    window.subtitleInterval = setInterval(updateSubtitleHighlight, 100);
                } else {
                    // 일시 정지 시 자막 하이라이트 업데이트 중지
                    clearInterval(window.subtitleInterval);
                }
            }
        }
    });
}

// 자막 데이터 가져오기
async function fetchSubtitles() {
    try {
        // 여기에 자막 파일의 경로를 지정하세요
        const res = await fetch('vocabulary_subtitles_1.json');
        const raw = await res.json();
        subtitles = raw.map(item => ({
            start: timeStringToSeconds(item.start_time),
            end: timeStringToSeconds(item.end_time),
            text_cn: item.text_cn || "",
            text_kr: item.text_kr || "",
            vocabulary: item.vocabulary || []
        }));
        displaySubtitles();
    } catch (err) {
        console.error("자막 로드 오류:", err);
        document.getElementById('subtitles').innerHTML =
            "<div class='error'>자막 데이터를 불러오는 데 실패했습니다. 오류: " + err.message + "</div>";
    }
}

// 자막 화면에 표시
function displaySubtitles() {
    const container = document.getElementById('subtitles');
    container.innerHTML = '';
    
    subtitles.forEach((sub, index) => {
        const div = document.createElement('div');
        div.className = 'subtitle-line';
        div.dataset.index = index;
        
        let cn = sub.text_cn;
        
        // 어휘가 있을 경우 블랭크 처리
        if (sub.vocabulary && sub.vocabulary.length) {
            sub.vocabulary.forEach(v => {
                // 단어를 정규식으로 찾아 블랭크로 대체
                const wordPattern = new RegExp(v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                cn = cn.replace(wordPattern, `<span class='vocab' data-word='${v.word}' data-pinyin='${v.pinyin}' data-meaning='${v.meaning}' data-example='${v.example}'>____</span>`);
            });
        }
        
        div.innerHTML = `
            <div class="cn-text">${cn}</div>
            <div class="kr-text">${sub.text_kr}</div>
        `;
        
        container.appendChild(div);
    });
    
    // 블랭크 클릭 이벤트 추가
    document.querySelectorAll('.vocab').forEach(el => {
        el.addEventListener('click', (e) => {
            // 클릭한 어휘 하이라이트
            document.querySelectorAll('.vocab').forEach(v => v.classList.remove('active'));
            e.target.classList.add('active');
            
            // 어휘 정보 표시
            const word = e.target.dataset.word;
            const meaning = e.target.dataset.meaning;
            const pinyin = e.target.dataset.pinyin;
            const example = e.target.dataset.example;
            
            displayVocabDetail(word, pinyin, meaning, example);
        });
    });
}

// 어휘 정보 표시
function displayVocabDetail(word, pinyin, meaning, example) {
    document.getElementById('no-vocab-message').style.display = 'none';
    document.getElementById('vocab-content').style.display = 'block';
    
    document.getElementById('vocab-title').textContent = word;
    document.getElementById('vocab-pinyin').textContent = pinyin;
    document.getElementById('vocab-meaning').textContent = meaning;
    
    // 예문 분리 (중국어/한국어)
    const exampleParts = example.split('(');
    if (exampleParts.length > 1) {
        document.getElementById('vocab-example-cn').textContent = exampleParts[0].trim();
        document.getElementById('vocab-example-kr').textContent = '(' + exampleParts[1];
    } else {
        document.getElementById('vocab-example-cn').textContent = example;
        document.getElementById('vocab-example-kr').textContent = '';
    }
}

// 현재 자막 하이라이트 업데이트
function updateSubtitleHighlight() {
    if (!player || !subtitles.length) return;
    
    // 현재 재생 시간에 싱크 오프셋 적용
    const syncOffset = parseInt(document.getElementById('sync-status').textContent.match(/-?\d+/)[0]) || DEFAULT_SYNC_OFFSET;
    const currentTime = player.getCurrentTime() + syncOffset;
    
    let activeSubtitleFound = false;
    
    subtitles.forEach((sub, index) => {
        const el = document.querySelector(`.subtitle-line[data-index='${index}']`);
        if (!el) return;
        
        // 현재 자막의 시작과 끝 시간 확인
        if (currentTime >= sub.start && currentTime <= sub.end) {
            // 현재 재생 중인 자막 하이라이트
            if (!el.classList.contains('highlight')) {
                el.classList.add('highlight');
                el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                currentSubtitleIndex = index;
            }
            activeSubtitleFound = true;
        } else if (index !== currentSubtitleIndex) {
            // 현재 활성화된 자막이 아니면 하이라이트 제거
            el.classList.remove('highlight');
        }
    });
    
    // 만약 활성화된 자막이 없고, 현재 시간이 다음 자막의 시작 시간보다 작으면
    // 현재 활성화된 자막의 하이라이트 유지
    if (!activeSubtitleFound && currentSubtitleIndex >= 0) {
        const nextSubIndex = currentSubtitleIndex + 1;
        
        // 다음 자막이 있고, 현재 시간이 다음 자막의 시작 시간보다 작으면 하이라이트 유지
        if (nextSubIndex < subtitles.length && currentTime < subtitles[nextSubIndex].start) {
            // 하이라이트 유지 (아무 작업 안 함)
        } else {
            // 그렇지 않으면 하이라이트 제거
            const currentEl = document.querySelector(`.subtitle-line[data-index='${currentSubtitleIndex}']`);
            if (currentEl) {
                currentEl.classList.remove('highlight');
            }
            currentSubtitleIndex = -1;
        }
    }
}

// 스타일 추가
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        .sync-controls-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 10px 0;
            padding: 8px;
            background-color: #f0f0f0;
            border-radius: 5px;
        }
        
        .sync-controls-container button {
            padding: 5px 10px;
            margin: 0 10px;
            background-color: #4285f4;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .sync-controls-container button:hover {
            background-color: #3367d6;
        }
        
        #sync-status {
            font-weight: bold;
            color: #333;
        }
    `;
    document.head.appendChild(style);
});
