
document.addEventListener('DOMContentLoaded', () => {
    // --- XÁC THỰC VÀ LẤY THÔNG TIN ---
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    let decodedToken;
    let currentUserId;

    // Lấy userId của trang profile từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const profileUserId = urlParams.get('id');

    // --- KHAI BÁO BIẾN GIAO DIỆN ---
    const profileAvatar = document.getElementById('profile-avatar');
    const profileUsername = document.getElementById('profile-username');
    const profileEmail = document.getElementById('profile-email');
    const profileDob = document.getElementById('profile-dob');
    const profileWorkplace = document.getElementById('profile-workplace');
    const profileHometown = document.getElementById('profile-hometown');
    const profileCurrentCity = document.getElementById('profile-current_city');
    const profileInterests = document.getElementById('profile-interests');
    const profileRelationshipStatus = document.getElementById('profile-relationship_status');
    const showEditProfileBtn = document.getElementById('show-edit-profile-btn');
    const avatarUploadForm = document.getElementById('avatar-upload-form');
    const avatarFileInput = document.getElementById('avatar-file-input');
    const editProfileModal = document.getElementById('edit-profile-modal');
    const editProfileForm = document.getElementById('edit-profile-form');
    const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // --- XỬ LÝ XÁC THỰC (Bố cục 3 cột) ---
    try {
        decodedToken = JSON.parse(atob(token.split('.')[1]));
        currentUserId = decodedToken.userId;
        
        const userAvatarSrc = decodedToken.avatar_url || `https://placehold.co/100x100/1D4ED8/FFFFFF?text=${decodedToken.username.charAt(0).toUpperCase()}`;

        // 1. Chèn HTML vào Sidebar Trái
        const leftSidebarProfile = document.getElementById('left-sidebar-profile');
        if (leftSidebarProfile) {
            leftSidebarProfile.innerHTML = `
                <a href="/profile.html?id=${currentUserId}" class="flex items-center gap-3 bg-gray-800/60 backdrop-blur-md p-4 rounded-2xl shadow-xl hover:bg-gray-700/50 transition-all duration-300">
                    <img class="w-12 h-12 rounded-full object-cover" src="${userAvatarSrc}" alt="Avatar">
                    <div>
                        <p class="font-bold text-white">${decodedToken.username}</p>
                        <span class="text-sm text-gray-400">Xem trang cá nhân</span>
                    </div>
                </a>
            `;
        }
        
        // 2. Chèn HTML vào Top Nav (Bên phải)
        const topNavProfile = document.getElementById('top-nav-profile');
        if (topNavProfile) {
            topNavProfile.innerHTML = `
                <button class="w-10 h-10 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-full transition-all duration-300">
                    <i class="fa-solid fa-comment-dots text-gray-200"></i>
                </button>
                <button class="w-10 h-10 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-full transition-all duration-300">
                    <i class="fa-solid fa-bell text-gray-200"></i>
                </button>
                <a href="/profile.html?id=${currentUserId}" class="w-10 h-10 rounded-full transition-all duration-300 hover:opacity-80">
                    <img class="w-10 h-10 rounded-full object-cover" src="${userAvatarSrc}" alt="Avatar">
                </a>
            `;
        }

        // 3. Gắn sự kiện cho nút Logout MỚI
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        });

    } catch (error) {
        console.error('Token hỏng hoặc hết hạn, đang xóa:', error);
        localStorage.removeItem('token'); 
        window.location.href = '/login.html'; 
        return; 
    }
    // --- KẾT THÚC SỬA ---


    if (!profileUserId) {
        window.location.href = `/profile.html?id=${currentUserId}`;
        return;
    }
    let userProfileData = {};

    const loadProfile = async () => {
        try {
            const response = await fetch(`/api/profile/${profileUserId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    window.location.href = '/login.html';
                }
                throw new Error('Không thể tải thông tin profile.');
            }
            userProfileData = await response.json();
            renderProfile(userProfileData);
            if (parseInt(profileUserId) === currentUserId) {
                setupEditMode();
            }
        } catch (error) {
            console.error('Lỗi tải profile:', error);
            document.querySelector('main').innerHTML = '<h2 class="text-center text-red-400 text-2xl">Không tìm thấy người dùng này.</h2>';
        }
    };

    const renderProfile = (data) => {
        const displayText = (text) => text || '<span class="text-gray-500">Chưa cập nhật</span>';
        const displayDate = (dateString) => {
            if (!dateString) return displayText(null);
            const date = dateString.split('T')[0];
            const [year, month, day] = date.split('-');
            return `${day}/${month}/${year}`;
        };
        profileAvatar.src = data.avatar_url || `https://placehold.co/160x160/1D4ED8/FFFFFF?text=${data.username.charAt(0).toUpperCase()}`;
        profileUsername.textContent = data.username;
        profileEmail.textContent = data.email;
        profileDob.innerHTML = displayDate(data.dob);
        profileWorkplace.innerHTML = displayText(data.workplace);
        profileHometown.innerHTML = displayText(data.hometown);
        profileCurrentCity.innerHTML = displayText(data.current_city);
        profileInterests.innerHTML = displayText(data.interests);
        profileRelationshipStatus.innerHTML = displayText(data.relationship_status);
    };

    const setupEditMode = () => {
        showEditProfileBtn.classList.remove('hidden');
        avatarUploadForm.classList.remove('hidden');
        showEditProfileBtn.addEventListener('click', () => {
            document.getElementById('edit-username').value = userProfileData.username;
            document.getElementById('edit-dob').value = userProfileData.dob ? userProfileData.dob.split('T')[0] : '';
            document.getElementById('edit-workplace').value = userProfileData.workplace || '';
            document.getElementById('edit-hometown').value = userProfileData.hometown || '';
            document.getElementById('edit-current_city').value = userProfileData.current_city || '';
            document.getElementById('edit-relationship_status').value = userProfileData.relationship_status || '';
            document.getElementById('edit-interests').value = userProfileData.interests || '';
            editProfileModal.classList.remove('hidden');
        });
        const closeModal = () => editProfileModal.classList.add('hidden');
        closeEditModalBtn.addEventListener('click', closeModal);
        cancelEditBtn.addEventListener('click', closeModal);
        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const updatedData = {
                username: document.getElementById('edit-username').value,
                dob: document.getElementById('edit-dob').value || null,
                workplace: document.getElementById('edit-workplace').value,
                hometown: document.getElementById('edit-hometown').value,
                current_city: document.getElementById('edit-current_city').value,
                relationship_status: document.getElementById('edit-relationship_status').value,
                interests: document.getElementById('edit-interests').value
            };
            try {
                const response = await fetch('/api/profile/me', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updatedData)
                });
                if (!response.ok) {
                    throw new Error(await response.text());
                }
                alert('Cập nhật thành công!');
                closeModal();
                loadProfile();
            } catch (error) {
                console.error('Lỗi cập nhật profile:', error);
                alert(`Lỗi: ${error.message}`);
            }
        });
        avatarFileInput.addEventListener('change', async () => {
            const file = avatarFileInput.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('avatar', file);
            try {
                const response = await fetch('/api/profile/avatar', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
                if (!response.ok) {
                    throw new Error(await response.text());
                }
                const result = await response.json();
                profileAvatar.src = result.avatar_url;
                alert('Cập nhật ảnh đại diện thành công!');
                // Cập nhật lại token (vì avatar đã đổi)
                const newDecodedToken = { ...decodedToken, avatar_url: result.avatar_url };
                // Dòng này hơi phức tạp, không bắt buộc:
                // localStorage.setItem('token', btoa(JSON.stringify(newDecodedToken.header)) + '.' + btoa(JSON.stringify(newDecodedToken)) + '.' + token.split('.')[2]);
                // Cách đơn giản là reload:
                window.location.reload();
            } catch (error) {
                console.error('Lỗi cập nhật avatar:', error);
                alert(`Lỗi: ${error.message}`);
            }
        });
    };

    // --- CHẠY LẦN ĐẦU ---
    loadProfile();
});


