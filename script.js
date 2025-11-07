document.addEventListener('DOMContentLoaded', () => {
    // --- KHAI BÁO BIẾN --- 
    const newsFeed = document.getElementById('news-feed');
    const createPostForm = document.getElementById('create-post-form');
    const sidebarContent = document.getElementById('sidebar-content'); // Đây là sidebar PHẢI
    const chatModal = document.getElementById('chat-modal');
    const closeChatBtn = document.getElementById('close-chat-btn');
    const chatWithName = document.getElementById('chat-with-name');
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const editPostModal = document.getElementById('edit-post-modal');
    const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editPostForm = document.getElementById('edit-post-form');
    const editPostContent = document.getElementById('edit-post-content');
    let currentEditingPostId = null;

    // --- LOGIC TỰ ĐỘNG PLAY VIDEO ---
    const handleVideoIntersect = (entries, observer) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                video.muted = true; 
                video.play().catch(e => console.error("Autoplay bị trình duyệt chặn:", e));
            } else {
                video.pause();
            }
        });
    };
    const videoObserver = new IntersectionObserver(handleVideoIntersect, {
        threshold: 0.5 
    });

    // --- XỬ LÝ XÁC THỰC (Bố cục 3 cột) --- 
    const token = localStorage.getItem('token');
    let decodedToken;
    let currentUserId;

    if (!token) {
        window.location.href = '/login.html';
        return;
    }

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

    const formatTime = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('vi-VN', options);
    };

    // --- LOGIC CHO BÀI VIẾT (TẠO, SỬA, XÓA) --- 
    const createPostElement = (post) => {
        const userAvatar = post.avatar_url || `https://placehold.co/100x100/1D4ED8/FFFFFF?text=${post.username.charAt(0).toUpperCase()}`;
                
        const postElement = document.createElement('div');
        postElement.className = 'post-container bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl shadow-xl';
        postElement.setAttribute('data-post-id', post.post_id);

        let optionsMenu = '';
        if (post.user_id === currentUserId) {
            optionsMenu = `
                <div class="relative">
                    <button class="post-options-btn text-gray-400 hover:text-white p-2 rounded-full transition-all duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                    </button>
                    <div class="post-options-menu absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-20">
                        <a href="#" class="edit-btn block px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 transition-all duration-300">Chỉnh sửa</a>
                        <a href="#" class="delete-btn block px-4 py-2 text-sm text-red-400 hover:bg-gray-600 transition-all duration-300">Xóa bài viết</a>
                    </div>
                </div>
            `;
        }

        let mediaHTML = '';
        if (post.image_url) {
            const url = post.image_url.toLowerCase();
            const isVideo = url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.webm');
            const isImage = url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.gif');

            if (isVideo) {
                mediaHTML = `
                    <video muted loop playsinline controls class="mt-4 rounded-lg w-full bg-black">
                        <source src="${post.image_url}" type="video/mp4">
                        Trình duyệt của bạn không hỗ trợ thẻ video.
                    </video>
                `;
            } else if (isImage) {
                mediaHTML = `<img src="${post.image_url}" alt="Post image" class="mt-4 rounded-lg w-full object-cover">`;
            }
        }
    
        const likeButtonClass = post.has_liked ? 'text-blue-500' : 'text-gray-400';

        postElement.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex items-center">
                    <img class="w-12 h-12 rounded-full mr-4 object-cover" src="${userAvatar}" alt="Avatar">
                    <div>
                        <a href="/profile.html?id=${post.user_id}" class="font-bold text-white hover:underline transition-all duration-300">${post.username}</a>
                        <p class="text-sm text-gray-400">${formatTime(post.created_at)}</p>
                    </div>
                </div>
                ${optionsMenu}
            </div>
            <p class="post-content mt-4 text-gray-300">${post.content ? post.content.replace(/\n/g, '<br>') : ''}</p>
            ${mediaHTML}
            <div class="mt-4 pt-4 border-t border-gray-700 flex items-center gap-6">
                <button class="like-btn flex items-center gap-2 ${likeButtonClass} hover:text-blue-400 transition-all duration-300 hover:scale-105" data-post-id="${post.post_id}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="${post.has_liked ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-7.027a2 2 0 01-1.789-2.894L10.263 7A2 2 0 0112.237 6h1.536a2 2 0 011.227.39l.01.01zM7 21H4a2 2 0 01-2-2v-7a2 2 0 012-2h3v9z" /></svg>
                    <span class="like-count">${post.like_count}</span> Thích
                </button>
                <button class="toggle-comment-btn flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 hover:scale-105" data-post-id="${post.post_id}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 5.523-4.477 10-10 10S1 17.523 1 12 5.477 2 11 2s10 4.477 10 10z" /></svg>
                    <span class="comment-count">${post.comment_count}</span> Bình luận
                </button>
            </div>
            <div class="comment-section hidden mt-4 pt-4 border-t border-gray-700" id="comment-section-${post.post_id}">
                <form class="comment-form flex gap-2" data-post-id="${post.post_id}">
                    <input type="text" class="comment-input flex-1 bg-gray-700 text-gray-200 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Viết bình luận...">
                    <button type="submit" class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg transition-all duration-300 hover:scale-105">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </form>
                <div class="comment-list mt-4 space-y-3" id="comment-list-${post.post_id}">
                    </div>
            </div>
        `;
        return postElement;
    };

    const createCommentElement = (comment) => {
        const avatar = comment.avatar_url || `https://placehold.co/100x100/7C3AED/E2E8F0?text=${comment.username.charAt(0).toUpperCase()}`;
        const commentDiv = document.createElement('div');
        commentDiv.className = "flex items-start gap-3";
        commentDiv.innerHTML = `
            <a href="/profile.html?id=${comment.user_id}" class="transition-all duration-300 hover:scale-105">
                <img class="w-9 h-9 rounded-full object-cover" src="${avatar}" alt="Avatar">
            </a>
            <div class="bg-gray-700 p-3 rounded-lg flex-1">
                <a href="/profile.html?id=${comment.user_id}" class="font-semibold text-white text-sm hover:underline transition-all duration-300">${comment.username}</a>
                <p class="text-gray-300 text-sm">${comment.content.replace(/\n/g, '<br>')}</p>
            </div>
        `;
        return commentDiv;
    };


    const fetchPosts = async () => {
        // --- SPINNER ---
        newsFeed.innerHTML = `
            <div class="flex justify-center items-center p-10 bg-gray-800/60 backdrop-blur-md rounded-2xl">
                <svg class="animate-spin h-8 w-8 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="ml-3 text-gray-300">Đang tải bài viết...</span>
            </div>
        `;

        try {
            const response = await fetch('/api/posts', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.status === 401 || response.status === 403) {
                 localStorage.removeItem('token');
                window.location.href = '/login.html';
                 return;
            }
            if (!response.ok) throw new Error('Network response was not ok');
            const posts = await response.json();

            newsFeed.innerHTML = ''; 
            
            if (posts.length === 0) {
                newsFeed.innerHTML = '<p class="text-center text-gray-400 p-10 bg-gray-800/60 backdrop-blur-md rounded-2xl">Chưa có bài viết nào. Hãy là người đầu tiên đăng bài!</p>';
            } else {
                posts.forEach(post => {
                    newsFeed.appendChild(createPostElement(post));
                });
            }
            
            newsFeed.querySelectorAll('video').forEach(video => {
                videoObserver.observe(video);
            });

        } catch (error) {
            console.error('Không thể tải bài viết:', error);
            newsFeed.innerHTML = '<p class="text-center text-red-400 p-10 bg-gray-800/60 backdrop-blur-md rounded-2xl">Lỗi! Không thể tải được news feed. Vui lòng F5 thử lại.</p>';
        }
    };

    createPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('content', document.getElementById('post-content').value);
        const mediaFile = document.getElementById('post-media').files[0];
        if (mediaFile) formData.append('media', mediaFile);
        try {
             const response = await fetch('/api/posts', {
                 method: 'POST',
                 headers: { 'Authorization': `Bearer ${token}` },
                 body: formData
            });
            if (response.ok) {
                createPostForm.reset();
                const newPostData = await response.json();
                const newPostElement = createPostElement(newPostData); 
                const noPostMsg = newsFeed.querySelector('p');
                if (noPostMsg) noPostMsg.remove();
                newsFeed.prepend(newPostElement); 
                const newVideo = newPostElement.querySelector('video');
                if (newVideo) {
                    videoObserver.observe(newVideo);
                }
            } else {
                const errorText = await response.text();
                alert(`Lỗi: ${errorText}`);
            }
        } catch (error) {
            console.error('Lỗi khi đăng bài:', error);
        }
    });

    // --- XỬ LÝ SỰ KIỆN (Sửa, Xóa, Like, Comment) --- 
    newsFeed.addEventListener('click', async (e) => {
        const target = e.target;
        const postContainer = target.closest('.post-container');
        if (!postContainer) return;
        const postId = postContainer.dataset.postId;
        if (target.closest('.delete-btn')) {
            e.preventDefault();
            if (confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) {
                try {
                    const response = await fetch(`/api/posts/${postId}`, {
                        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const video = postContainer.querySelector('video');
                        if (video) videoObserver.unobserve(video);
                        postContainer.remove();
                    }
                    else alert('Lỗi: không thể xóa bài viết.');
                } catch (err) { console.error(err); }
            }
        }
        if (target.closest('.edit-btn')) {
            e.preventDefault();
            const contentElement = postContainer.querySelector('.post-content');
            const currentContent = contentElement.innerHTML.replace(/<br\s*[\/]?>/gi, "\n");
            currentEditingPostId = postId;
            editPostContent.value = currentContent;
            editPostModal.classList.remove('hidden');
        }
        const likeButton = target.closest('.like-btn');
        if (likeButton) {
            e.preventDefault();
            try {
                const response = await fetch(`/api/posts/${postId}/like`, {
                    method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Lỗi like');
                const result = await response.json();
                const likeCountSpan = likeButton.querySelector('.like-count');
                const currentCount = parseInt(likeCountSpan.textContent);
                const svg = likeButton.querySelector('svg');
                if (result.liked) {
                    likeButton.classList.add('text-blue-500');
                    likeButton.classList.remove('text-gray-400');
                    svg.setAttribute('fill', 'currentColor');
                    likeCountSpan.textContent = currentCount + 1;
                } else {
                    likeButton.classList.remove('text-blue-500');
                    likeButton.classList.add('text-gray-400');
                    svg.setAttribute('fill', 'none');
                    likeCountSpan.textContent = currentCount - 1;
                }
            } catch (err) { console.error('Lỗi khi like:', err); }
        }
        const commentButton = target.closest('.toggle-comment-btn');
        if (commentButton) {
            e.preventDefault();
            const commentSection = document.getElementById(`comment-section-${postId}`);
            const commentList = document.getElementById(`comment-list-${postId}`);
            const isHidden = commentSection.classList.toggle('hidden');
            if (!isHidden && commentList.children.length === 0) {
                try {
                    commentList.innerHTML = '<p class="text-gray-400">Đang tải bình luận...</p>';
                    const response = await fetch(`/api/posts/${postId}/comments`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error('Lỗi tải comment');
                    const comments = await response.json();
                    commentList.innerHTML = ''; 
                    if (comments.length === 0) {
                        commentList.innerHTML = '<p class="text-gray-500 text-sm text-center">Chưa có bình luận nào.</p>';
                    } else {
                        comments.forEach(comment => commentList.appendChild(createCommentElement(comment)));
                    }
                } catch (err) {
                    console.error('Lỗi tải comments:', err);
                    commentList.innerHTML = '<p class="text-red-400">Lỗi tải bình luận.</p>';
                }
            }
        }
    });

    newsFeed.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target.closest('.comment-form');
        if (!form) return;
        const postId = form.dataset.postId;
        const input = form.querySelector('.comment-input');
        const content = input.value.trim();
        if (!content) return;
        try {
            const response = await fetch(`/api/posts/${postId}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: content })
            });
            if (!response.ok) throw new Error(await response.text());
            const newComment = await response.json();
            const commentList = document.getElementById(`comment-list-${postId}`);
            const noCommentMsg = commentList.querySelector('p');
            if (noCommentMsg) noCommentMsg.remove();
            commentList.appendChild(createCommentElement(newComment));
            input.value = '';
            const countSpan = document.querySelector(`.toggle-comment-btn[data-post-id="${postId}"] .comment-count`);
            countSpan.textContent = parseInt(countSpan.textContent) + 1;
        } catch (err) {
            console.error('Lỗi gửi comment:', err);
            alert(`Lỗi: ${err.message}`);
        }
    });

    // --- Xử lý Modal Chỉnh sửa ---
    const closeEditModal = () => {
        editPostModal.classList.add('hidden');
        currentEditingPostId = null;
    };
    closeEditModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', cancelEditBtn);
    editPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentEditingPostId) return;
        const newContent = editPostContent.value;
        try {
            const response = await fetch(`/api/posts/${currentEditingPostId}`, {
                method: 'PUT',
                 headers: {
                     'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                 },
                 body: JSON.stringify({ content: newContent })
            });
            if (response.ok) {
                const postOnPage = document.querySelector(`.post-container[data-post-id='${currentEditingPostId}'] .post-content`);
                if (postOnPage) {
                    postOnPage.innerHTML = newContent.replace(/\n/g, '<br>');
                }
                closeEditModal();
            } else {
                alert('Lỗi: không thể cập nhật bài viết.');
            }
        } catch (err) { console.error(err); }
    });

    // --- LOGIC CHO BẠN BÈ VÀ SIDEBAR (PHẢI) --- 
    const loadSidebar = async () => {
        try {
            const response = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch friends');
            const friends = await response.json();
            
            const friendsListHTML = friends.map(friend => `
                <a href="/profile.html?id=${friend.user_id}" class="flex items-center cursor-pointer hover:bg-gray-700/50 p-2 rounded-lg col-span-2 transition-all duration-300" data-user-id="${friend.user_id}" data-username="${friend.username}">
                    <img class="w-10 h-10 rounded-full object-cover mr-3" src="${friend.avatar_url || `https://placehold.co/100x100/7C3AED/E2E8F0?text=${friend.username.charAt(0).toUpperCase()}`}" alt="Avatar">
                    <span class="font-semibold">${friend.username}</span>
                </a>
                <button class="open-chat-btn text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-full transition-all duration-300 hover:scale-105" data-user-id="${friend.user_id}" data-username="${friend.username}">
                    Chat
                </button>
            `).join('');

            sidebarContent.innerHTML = `
                <div class="bg-gray-800/60 backdrop-blur-md p-4 rounded-2xl shadow-xl">
                    <h3 class="font-bold text-lg mb-3 text-white flex items-center gap-2">
                        <i class="fa-solid fa-address-book"></i> Người liên hệ
                    </h3>
                    <div class="grid grid-cols-3 gap-x-2 gap-y-3 items-center">
                        ${friendsListHTML}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Lỗi tải danh sách bạn bè:', error);
        }
    };
    
    sidebarContent.addEventListener('click', (e) => {
        const chatButton = e.target.closest('.open-chat-btn');
        if (chatButton) {
            e.preventDefault(); 
            openChat(chatButton.dataset.userId, chatButton.dataset.username);
        }
    });

    // --- LOGIC CHO CHAT --- 
    let currentChatUserId = null;
    const openChat = (userId, username) => {
        currentChatUserId = userId;
        chatWithName.textContent = `Trò chuyện với ${username}`;
        chatModal.classList.remove('hidden');
        chatInput.focus();
        loadMessages(userId);
    };
    const closeChat = () => chatModal.classList.add('hidden');
    const renderMessage = (message) => {
        const messageDiv = document.createElement('div');
        const isMyMessage = message.sender_id === currentUserId;
        messageDiv.className = `flex mb-3 ${isMyMessage ? 'justify-end' : 'justify-start'}`;
        messageDiv.innerHTML = `
            <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${isMyMessage ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-200'}">
                <p>${message.content}</p>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
    };
    const loadMessages = async (otherUserId) => {
        chatMessages.innerHTML = '';
        try {
            const response = await fetch(`/api/messages/${otherUserId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const messages = await response.json();
            messages.forEach(renderMessage);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } catch (error) { console.error('Lỗi tải tin nhắn:', error); }
    };
    const sendMessage = async (e) => {
        e.preventDefault();
        const content = chatInput.value.trim();
        if (!content || !currentChatUserId) return;
        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ receiver_id: currentChatUserId, content: content })
            });
            if (response.ok) {
                const newMessage = await response.json();
                renderMessage(newMessage);
                chatInput.value = '';
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        } catch (error) { console.error('Lỗi gửi tin nhắn:', error); }
    };
    closeChatBtn.addEventListener('click', closeChat);
    chatForm.addEventListener('submit', sendMessage);

    // --- TẢI DỮ LIỆU BAN ĐẦU --- 
    fetchPosts();
    loadSidebar();
});
