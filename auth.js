
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const errorMessageDiv = document.getElementById('error-message');
    const successMessageDiv = document.getElementById('success-message');

    // Xử lý form đăng nhập 
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMessageDiv.textContent = '';
            
            const email = loginForm.email.value;
            const password = loginForm.password.value;

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                if (res.ok) {
                    const data = await res.json();
                    localStorage.setItem('token', data.accessToken);
                    window.location.href = '/'; // Chuyển về trang chủ
                } else {
                    const errorText = await res.text();
                    errorMessageDiv.textContent = errorText;
                }
            } catch (err) {
                errorMessageDiv.textContent = 'Lỗi kết nối. Vui lòng thử lại.';
            }
        });
    }

    // Xử lý form đăng ký 
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMessageDiv.textContent = '';
            successMessageDiv.textContent = '';
            
            const username = registerForm.username.value;
            const email = registerForm.email.value;
            const password = registerForm.password.value;

            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                if (res.ok) {
                    successMessageDiv.textContent = 'Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.';
                    registerForm.reset();
                } else {
                    const errorText = await res.text();
                    errorMessageDiv.textContent = errorText;
                }
            } catch (err) {
                errorMessageDiv.textContent = 'Lỗi kết nối. Vui lòng thử lại.';
            }
        });
    }
});


