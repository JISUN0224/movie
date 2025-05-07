let player, subtitles = [], currentSubtitleIndex = -1;

// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', function() {
    // 메인 컨테이너 구조 변경
    restructureLayout();
    
    // 비디오 로드 버튼 이벤트 리스너
    document.getElementById('loadVideo').addEventListener('click', loadVideo);
    
    // 발음 버튼 이벤트 리스너
    document.body.addEventListener('click', function(e) {
        if (e.target.id === 'pronunciation-btn' || e.target.closest('#pronunciation-btn')) {
            const word = document.getElementById('vocab-title').textContent;
            if (word) {
                speakChinese(word);
            }
        }
    });
    
    // 자막 데이터 자동 로드
    fetchSubtitles();
});

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

// 레이아웃 구조 변경
function restructureLayout() {
    const container = document.querySelector('.container');
    const videoContainer = document.querySelector('.video-container');
    const subtitleContainer = document.querySelector('.subtitle-container');
    
    // 컨트롤을 상단으로 이동
    const controls = document.querySelector('.controls');
    container.insertBefore(controls, videoContainer);
    
    // 메인 콘텐츠 영역 생성
    const mainContent = document.createElement('div');
    mainContent.className = 'main-content';
    
    // 왼쪽 패널 생성
    const leftPanel = document.createElement('div');
    leftPanel.className = 'left-panel';
    
    // 오른쪽 패널 생성
    const rightPanel = document.createElement('div');
    rightPanel.className = 'right-panel';
    
    // 기존 요소 이동
    container.appendChild(mainContent);
    mainContent.appendChild(leftPanel);
    mainContent.appendChild(rightPanel);
    
    // 비디오와 자막을 왼쪽 패널로 이동
    videoContainer.remove();
    subtitleContainer.remove();
    leftPanel.appendChild(videoContainer);
    leftPanel.appendChild(subtitleContainer);
    
    // 어휘 정보 패널 생성
    const vocabDetailContainer = document.createElement('div');
    vocabDetailContainer.className = 'vocab-detail-container';
    vocabDetailContainer.id = 'vocab-detail';
    
    vocabDetailContainer.innerHTML = `
        <div class="no-vocab-selected" id="no-vocab-message">
            <p>왼쪽의 블랭크를 클릭하면<br>어휘 정보가 여기에 표시됩니다.</p>
        </div>
        
        <div id="vocab-content" style="display: none;">
            <div class="vocab-header">
                <h2 class="vocab-title" id="vocab-title">단어</h2>
                <button class="pronunciation-btn" id="pronunciation-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    </svg>
                    발음 듣기
                </button>
            </div>
            
            <div class="vocab-content">
                <div class="pinyin" id="vocab-pinyin">pinyin</div>
                <div class="meaning" id="vocab-meaning">의미</div>
                <div class="example">
                    <div class="example-cn" id="vocab-example-cn">예문 (중국어)</div>
                    <div class="example-kr" id="vocab-example-kr">예문 (한국어)</div>
                </div>
            </div>
        </div>
    `;
    
    rightPanel.appendChild(vocabDetailContainer);
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
        videoId: '',
        playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1
        },
        events: {
            'onReady': () => {
                document.getElementById('loadVideo').addEventListener('click', loadVideo);
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

// 비디오 로드 함수
function loadVideo() {
    const videoId = document.getElementById('videoId').value.trim();
    if (videoId) {
        player.loadVideoById(videoId);
        player.pauseVideo(); // 자동 재생 방지
    } else {
        alert('유효한 YouTube 비디오 ID를 입력해주세요.');
    }
}

// 자막 데이터 가져오기
async function fetchSubtitles() {
    try {
        // 자막 파일 경로는 실제 환경에 맞게 조정 필요
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
            "<div class='error'>자막 데이터를 불러오는 데 실패했습니다.</div>";
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
    
    const currentTime = player.getCurrentTime();
    
    subtitles.forEach((sub, index) => {
        const el = document.querySelector(`.subtitle-line[data-index='${index}']`);
        if (!el) return;
        
        if (currentTime >= sub.start && currentTime <= sub.end) {
            // 현재 재생 중인 자막 하이라이트
            if (!el.classList.contains('highlight')) {
                el.classList.add('highlight');
                el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }
        } else {
            el.classList.remove('highlight');
        }
    });
}
