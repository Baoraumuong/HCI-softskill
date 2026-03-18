document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginPage = document.getElementById('login-page');
    const interviewPage = document.getElementById('interview-page');
    const reviewPage = document.getElementById('review-page');
    
    const loginBtn = document.getElementById('login-btn');
    const startBtn = document.getElementById('start-btn');
    const endBtn = document.getElementById('end-btn');
    const retryBtn = document.getElementById('retry-btn');
    
    const userWebcam = document.getElementById('user-webcam');
    const aiText = document.getElementById('ai-text');
    const recordingStatus = document.getElementById('recording-status');

    let stream = null; // Biến lưu luồng camera

    // --- Hàm điều hướng ---
    function showPage(pageToShow) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        pageToShow.classList.add('active');
    }

    // --- Logic Camera ---
    async function startCamera() {
        try {
            // Yêu cầu quyền truy cập camera và microphone
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            userWebcam.srcObject = stream;
        } catch (err) {
            console.error("Lỗi truy cập webcam: ", err);
            alert("Không thể truy cập camera. Vui lòng cấp quyền!");
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            userWebcam.srcObject = null;
        }
    }

    // --- Các Event Listeners ---

    // 1. Click nút đăng nhập
    loginBtn.addEventListener('click', () => {
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        if (user && pass) {
            showPage(interviewPage);
            startCamera(); // Bật camera ngay khi vào phòng
        } else {
            alert("Vui lòng nhập Username và Password");
        }
    });

    // 2. Click nút Bắt đầu phỏng vấn
    startBtn.addEventListener('click', () => {
        startBtn.disabled = true;
        endBtn.disabled = false;
        recordingStatus.innerText = "🔴 Đang ghi hình phỏng vấn...";
        recordingStatus.style.color = "red";
        aiText.innerText = "Hãy giới thiệu đôi nét về bản thân và kinh nghiệm của bạn.";
        
        // Ghi chú: Ở thực tế, bạn sẽ dùng MediaRecorder API để ghi lại luồng video (stream) tại đây.
    });

    // 3. Click nút Kết thúc phỏng vấn
    endBtn.addEventListener('click', () => {
        stopCamera();
        showPage(reviewPage);
        
        // Reset lại UI cho lần sau
        startBtn.disabled = false;
        endBtn.disabled = true;
        recordingStatus.innerText = "Camera đã sẵn sàng";
        recordingStatus.style.color = "#333";
    });

    // 4. Click nút Thử lại (quay về màn phỏng vấn)
    retryBtn.addEventListener('click', () => {
        showPage(interviewPage);
        startCamera();
        aiText.innerText = "Xin chào, tôi là AI hỗ trợ phỏng vấn. Hãy nhấn Bắt đầu khi bạn đã sẵn sàng.";
    });
});