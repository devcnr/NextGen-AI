async function sendMessage() {
    const input = document.querySelector('.input-field');
    const message = input.value.trim();

    if (!message) return;

    addMessage('user', message);
    input.value = '';


    try {
        const reply = await sendMessageToAPI(message);
        addMessage('bot', reply);
    } catch (error) {
        console.error('API isteği başarısız:', error);
        showNotification('API isteği başarısız oldu.', 'error');
    }
}

function toggleEmoji() {
    // Eğer zaten emoji picker varsa kaldır
    const existingPicker = document.querySelector('.emoji-picker');
    if (existingPicker) {
        existingPicker.remove();
        return;
    }

    const emojiPicker = document.createElement('div');
    emojiPicker.className = 'emoji-picker';

    // Daha geniş emoji listesi
    const emojis = [
        '😀', '😃', '😄', '😁', '😆',
        '😅', '🤣', '😂', '🙂', '🙃',
        '😉', '😊', '😇', '🥰', '😍',
        '🤩', '😘', '😗', '😚', '😙',
        '😋', '😛', '😜', '🤪', '😝',
        '🤑', '🤗', '🤭', '🤫', '🤔'
    ];

    const emojiGrid = document.createElement('div');
    emojiGrid.className = 'emoji-grid';

    emojis.forEach(emoji => {
        const emojiButton = document.createElement('button');
        emojiButton.textContent = emoji;
        emojiButton.addEventListener('click', () => insertEmoji(emoji));
        emojiGrid.appendChild(emojiButton);
    });

    emojiPicker.appendChild(emojiGrid);

    // Input alanının yanına emoji picker'ı ekle
    const inputArea = document.querySelector('.input-area');
    inputArea.appendChild(emojiPicker);

    // Dışarı tıklandığında emoji picker'ı kapat
    function closeEmojiPicker(e) {
        if (!emojiPicker.contains(e.target) &&
            !e.target.closest('.action-btn')) {
            emojiPicker.remove();
            document.removeEventListener('click', closeEmojiPicker);
        }
    }

    // Kısa bir süre sonra event listener'ı ekle
    setTimeout(() => {
        document.addEventListener('click', closeEmojiPicker);
    }, 0);
}

function insertEmoji(emoji) {
    const input = document.querySelector('.input-field');

    // Emoji'yi input alanına ekle
    input.value += emoji;

    // Input alanına odaklan
    input.focus();
}

let state = {
    chats: [],
    currentChatId: null,
    isVoiceInputActive: false,
    isAutoReadActive: false,
    darkMode: localStorage.getItem('darkMode') === 'true',
    savedChats: JSON.parse(localStorage.getItem('savedChats')) || []
};

state = {
    ...state,
    isAutoReadActive: false,
    speechSynthesis: window.speechSynthesis,
    currentUtterance: null
};

// Sesli okuma toggle fonksiyonu
function toggleAutoRead() {
    const button = document.querySelector('.action-btn i.fa-volume-up');
    state.isAutoReadActive = !state.isAutoReadActive;

    if (state.isAutoReadActive) {
        button.style.color = 'var(--primary-color)';
        showNotification('Sesli okuma aktif', 'success');
        // Mevcut mesajı okumaya başla
        const lastMessage = document.querySelector('.message-bot:last-child');
        if (lastMessage) {
            readMessage(lastMessage.textContent);
        }
    } else {
        button.style.color = '';
        showNotification('Sesli okuma devre dışı', 'warning');
        // Mevcut okumayı durdur
        stopReading();
    }
}

// Mesaj okuma fonksiyonu
function readMessage(text) {
    // Eğer sesli okuma aktif değilse çık
    if (!state.isAutoReadActive) return;

    // Eğer zaten okuma yapılıyorsa durdur
    stopReading();

    // HTML etiketlerini temizle
    const cleanText = text.replace(/<[^>]*>/g, '');

    // Yeni okuma oluştur
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'tr-TR';
    utterance.rate = 1; // Normal hız
    utterance.pitch = 1; // Normal ton

    // Hata durumunu yakala
    utterance.onerror = (event) => {
        console.error('Sesli okuma hatası:', event.error);
        showNotification('Sesli okuma sırasında hata oluştu', 'error');
        state.isAutoReadActive = false;
        const button = document.querySelector('.action-btn i.fa-volume-up');
        button.style.color = '';
    };

    // Okumayı başlat
    state.currentUtterance = utterance;
    state.speechSynthesis.speak(utterance);
}

// Okumayı durdurma fonksiyonu
function stopReading() {
    if (state.speechSynthesis) {
        state.speechSynthesis.cancel();
    }
}

// addMessage fonksiyonunu güncelle
const originalAddMessage = addMessage;
addMessage = function (type, content) {
    originalAddMessage(type, content);

    // Eğer bot mesajıysa ve sesli okuma aktifse oku
    if (type === 'bot' && state.isAutoReadActive) {
        readMessage(content);
    }
};

// Sayfa yüklendiğinde sesleri yükle
document.addEventListener('DOMContentLoaded', () => {
    // Sayfa yenilendiğinde sesli okumayı sıfırla
    state.isAutoReadActive = false;
    const button = document.querySelector('.action-btn i.fa-volume-up');
    if (button) {
        button.style.color = '';
    }
});


function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} animate__animated animate__fadeInDown`;
    notification.textContent = message;

    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}


function saveCurrentChat() {
    const currentChat = state.chats.find(chat => chat.id === state.currentChatId);
    if (currentChat) {
        const savedChats = JSON.parse(localStorage.getItem('savedChats')) || [];
        const isAlreadySaved = savedChats.find(chat => chat.id === currentChat.id);

        if (isAlreadySaved) {
            showNotification('Bu sohbet zaten kaydedilmiş.', 'warning');
            return;
        }

        savedChats.push(currentChat);
        localStorage.setItem('savedChats', JSON.stringify(savedChats));
        showNotification('Sohbet başarıyla kaydedildi!');
    } else {
        showNotification('Kaydedilecek aktif bir sohbet yok.', 'error');
    }
}

function renderSavedChats() {
    const savedChats = JSON.parse(localStorage.getItem('savedChats')) || [];
    const chatMessages = document.querySelector('.chat-messages');
    clearMessages();

    if (savedChats.length === 0) {
        chatMessages.innerHTML = '<p>Henüz kaydedilen bir sohbet yok.</p>';
        return;
    }

    chatMessages.innerHTML = `
<div class="saved-chats">
    <h2>Kaydedilen Sohbetler</h2>
    ${savedChats.map(chat => `
        <div class="saved-chat-item">
            <div>
                <h4>${chat.title}</h4>
                <small>${new Date(chat.messages[0]?.timestamp || Date.now()).toLocaleString()}</small>
            </div>
            <div class="chat-actions">
                <button class="action-btn" onclick="loadSavedChat(${chat.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn" onclick="deleteSavedChat(${chat.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('')}
</div>
`;
}

function loadSavedChat(chatId) {
    const savedChats = JSON.parse(localStorage.getItem('savedChats')) || [];
    const chatToLoad = savedChats.find(chat => chat.id === chatId);

    if (chatToLoad) {
        state.currentChatId = chatToLoad.id;
        clearMessages();
        chatToLoad.messages.forEach(message => renderMessage(message));
        showNotification('Kaydedilen sohbet yüklendi!');
    } else {
        showNotification('Sohbet bulunamadı.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadChatList(); // Sayfa yüklendiğinde sohbet listesini yükle
});

// Kaydedilen Sohbeti Silme
function deleteSavedChat(chatId) {
    let savedChats = JSON.parse(localStorage.getItem('savedChats')) || [];
    savedChats = savedChats.filter(chat => chat.id !== chatId);
    localStorage.setItem('savedChats', JSON.stringify(savedChats));
    renderSavedChats();
    showNotification('Sohbet başarıyla silindi!');
}

// Mesajları Temizleme
function clearMessages() {
    const chatMessages = document.querySelector('.chat-messages');
    chatMessages.innerHTML = '';
}

function loadChatList() {
    fetch('/chats', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error(data.error);
            return;
        }

        const chatList = document.querySelector('.chat-list');
        chatList.innerHTML = ''; // Mevcut listeyi temizle

        // Yeni sohbet butonunu ekle
        const newChatButton = document.createElement('button');
        newChatButton.className = 'new-chat-btn';
        newChatButton.textContent = '+ Yeni Sohbet';
        newChatButton.onclick = startNewChat;
        chatList.appendChild(newChatButton);

        // Hedeflerim butonunu ekle
        const goalsButton = document.createElement('button');
        goalsButton.className = 'goals-btn';
        goalsButton.innerHTML = `
            <i class="fas fa-bullseye"></i>
            <span>Hedeflerim</span>
        `;
        goalsButton.onclick = showGoals;
        chatList.appendChild(goalsButton);

        // Sohbet listesini ekle
        data.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.dataset.chatId = chat.id; // Chat ID'sini kaydet

            // Ana sohbet içeriği için div
            const chatContent = document.createElement('div');
            chatContent.className = 'chat-content';
            chatContent.innerHTML = `<span>${chat.name}</span>`;
            chatContent.onclick = () => loadChat(chat.id);

            // Detay butonu için ayrı div
            const detailButton = document.createElement('button');
            detailButton.className = 'detay-btn';
            detailButton.innerHTML = '<i class="fas fa-ellipsis-h"></i>';
            detailButton.onclick = (e) => {
                e.stopPropagation();
                toggleChatMenu(chat.id);
            };

            chatItem.appendChild(chatContent);
            chatItem.appendChild(detailButton);
            chatList.appendChild(chatItem);
        });

        // Menü container'ı oluştur (tek bir floating menü)
        if (!document.querySelector('.floating-menu')) {
            const menuContainer = document.createElement('div');
            menuContainer.className = 'floating-menu';
            menuContainer.innerHTML = `
                <div class="menu-content">
                    <button class="menu-item edit-btn">Düzenle</button>
                    <button class="menu-item delete-btn">Sil</button>
                </div>
            `;
            document.body.appendChild(menuContainer);

            // "Düzenle" butonuna tıklama olayı ekle
            const editButton = menuContainer.querySelector('.edit-btn');
            editButton.addEventListener('click', () => {
                const chatId = menuContainer.dataset.chatId; // Menüdeki chatId'yi al
                if (chatId) {
                    editChatName(chatId); // Sohbet adını düzenle
                }
            });

            // "Sil" butonuna tıklama olayı ekle
            const deleteButton = menuContainer.querySelector('.delete-btn');
            deleteButton.addEventListener('click', () => {
                const chatId = menuContainer.dataset.chatId; // Menüdeki chatId'yi al
                if (chatId) {
                    deleteChatConfirm(chatId); // Sohbeti sil
                }
            });
        }
    })
    .catch(error => {
        console.error('Hata:', error);
    });
}


function showGoals() {
    const goalsPage = document.getElementById('goalsPage');
    if (goalsPage.style.display === 'none' || goalsPage.style.display === '') {
        goalsPage.style.display = 'block'; // Hedeflerim sayfasını göster
    } else {
        goalsPage.style.display = 'none'; // Hedeflerim sayfasını gizle
    }
}

function toggleChatMenu(chatId) {
    const menu = document.querySelector('.floating-menu');
    const menuContent = menu.querySelector('.menu-content');
    const button = event.target;
    const buttonRect = button.getBoundingClientRect();

    // Menü görünür durumdaysa ve aynı sohbet için tıklandıysa, menüyü kapat
    if (menu.classList.contains('active') && menu.dataset.chatId === chatId.toString()) {
        menu.classList.remove('active');
        menuContent.classList.remove('show');
        setTimeout(() => {
            menu.style.display = 'none';
        }, 300);
        return;
    }

    // Menüyü konumlandır
    menu.style.position = 'fixed';
    menu.style.top = `${buttonRect.bottom + 5}px`;
    menu.style.left = `${buttonRect.left + 20}px`;
    menu.style.display = 'block';
    menu.dataset.chatId = chatId; // Chat ID'sini kaydet

    // Animasyon için timeout kullan
    requestAnimationFrame(() => {
        menu.classList.add('active');
        menuContent.classList.add('show');
    });
}


function editChatName(chatId) {
    // Input validation
    if (!chatId || typeof chatId !== 'string') {
        showNotification('Geçersiz sohbet ID', 'error');
        return;
    }

    // Escape special characters in chatId for querySelector
    const escapedChatId = CSS.escape(chatId);
    const chatItem = document.querySelector(`.chat-item[data-chat-id="${escapedChatId}"]`);
    if (!chatItem) {
        showNotification('Sohbet bulunamadı', 'error');
        return;
    }

    const nameSpan = chatItem.querySelector('.chat-content span');
    if (!nameSpan) {
        showNotification('Sohbet adı elementi bulunamadı', 'error');
        return;
    }

    const currentName = nameSpan.textContent.trim();

    // Check if already editing
    if (chatItem.querySelector('.edit-name-container')) {
        return; // Prevent multiple edit fields
    }

    // Create edit interface
    const inputContainer = document.createElement('div');
    inputContainer.className = 'edit-name-container';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'edit-name-input';
    input.maxLength = 100; // Prevent extremely long names

    const saveButton = document.createElement('button');
    saveButton.innerHTML = '<i class="fas fa-check"></i>';
    saveButton.className = 'edit-save-btn';
    saveButton.title = 'Kaydet';

    const cancelButton = document.createElement('button');
    cancelButton.innerHTML = '<i class="fas fa-times"></i>';
    cancelButton.className = 'edit-cancel-btn';
    cancelButton.title = 'İptal';

    inputContainer.append(input, saveButton, cancelButton);

    // Save function
    const saveChanges = async () => {
        const newName = input.value.trim();
        if (!newName) {
            showNotification('Sohbet adı boş olamaz', 'error');
            return;
        }

        try {
            const response = await fetch(`/chat/${encodeURIComponent(chatId)}/edit`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
                },
                body: JSON.stringify({ name: newName })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Sohbet güncellenirken bir hata oluştu.');
            }

            const data = await response.json();

            nameSpan.textContent = newName;
            nameSpan.style.display = '';
            inputContainer.remove();
            showNotification('Sohbet adı güncellendi', 'success');

            // Close any open menus
            document.querySelectorAll('.floating-menu').forEach(menu => {
                menu.style.display = 'none';
            });

        } catch (error) {
            console.error('Sohbet güncelleme hatası:', error);
            showNotification(error.message || 'Sohbet güncellenirken bir hata oluştu', 'error');
        }
    };

    // Event handlers
    const cleanup = () => {
        nameSpan.style.display = '';
        inputContainer.remove();
        document.removeEventListener('click', handleClickOutside);
    };

    const handleClickOutside = (e) => {
        if (!inputContainer.contains(e.target)) {
            cleanup();
        }
    };

    saveButton.addEventListener('click', saveChanges);
    cancelButton.addEventListener('click', cleanup);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveChanges();
        } else if (e.key === 'Escape') {
            cleanup();
        }
    });

    // Setup edit interface
    nameSpan.style.display = 'none';
    chatItem.querySelector('.chat-content').appendChild(inputContainer);
    input.focus();
    input.select();

    // Add click outside handler with delay
    setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
    }, 100);

    const style = document.createElement('style');
style.textContent = `
.edit-name-container {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 4px;
    background-color: var(--background-color, #fff);
    border-radius: 4px;
}

.edit-name-input {
    padding: 4px 8px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    font-size: 14px;
    flex-grow: 1;
    min-width: 100px;
    max-width: 300px;
}

.edit-save-btn, .edit-cancel-btn {
    padding: 4px 8px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s;
}

.edit-save-btn {
    background-color: var(--primary-color, #4CAF50);
    color: white;
}

.edit-cancel-btn {
    background-color: var(--error-color, #f44336);
    color: white;
}

.edit-save-btn:hover, .edit-cancel-btn:hover {
    opacity: 0.9;
}

.edit-save-btn:focus, .edit-cancel-btn:focus, .edit-name-input:focus {
    outline: 2px solid var(--focus-color, #2196F3);
    outline-offset: 2px;
}
`;

// Remove any existing style element
const existingStyle = document.querySelector('style[data-chat-editor-style]');
if (existingStyle) {
    existingStyle.remove();
}

// Add new style element with identifier
style.setAttribute('data-chat-editor-style', '');
document.head.appendChild(style);

}

let isConfirmationShown = false; // Onay kutusunun gösterilip gösterilmediğini kontrol etmek için

function deleteChatConfirm(chatId) {
    if (!chatId) {
        showNotification('Geçersiz sohbet ID\'si', 'error');
        return;
    }

    // Eğer onay kutusu daha önce gösterildiyse, tekrar gösterme
    if (isConfirmationShown) {
        return;
    }

    // Kullanıcıya onay kutusu göster
    const confirmation = confirm('Bu sohbeti silmek istediğinize emin misiniz?');
    
    if (confirmation) {
        isConfirmationShown = true; // Onay kutusunun gösterildiğini işaretle

        // API'ye silme isteği gönder
        fetch(`/api/chat/${chatId}/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Oturum bilgilerini göndermek için
        })
        .then(response => {
            if (!response.ok) {
                // Eğer yanıt başarısızsa, hatayı yakala
                return response.json().then(err => {
                    throw new Error(err.error || 'Sohbet silinirken bir hata oluştu.');
                });
            }
            return response.json();
        })
        .then(data => {
            // UI'dan sohbeti kaldır
            const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
            if (chatItem) {
                chatItem.remove();
            }
            
            showNotification('Sohbet başarıyla silindi', 'success');

            // Eğer silinen sohbet aktif sohbetse, mesajları temizle
            if (currentChatId === chatId) {
                clearMessages();
                currentChatId = null;
            }

            // Chat listesini yeniden yükle
            loadChatList();
        })
        .catch(error => {
            console.error('Sohbet silme hatası:', error);
            showNotification(error.message || 'Sohbet silinirken bir hata oluştu', 'error');
        })
        .finally(() => {
            isConfirmationShown = false; // İşlem tamamlandıktan sonra bayrağı sıfırla
        });
    }
}


// Menü event listener'ları
function setupMenuListeners() {
    document.addEventListener('click', (e) => {
        const menu = document.querySelector('.floating-menu');
        const menuContent = menu?.querySelector('.menu-content');
        
        // Edit butonu tıklaması
        if (e.target.closest('.edit-btn')) {
            const chatId = menu.dataset.chatId;
            if (chatId) {
                editChatName(chatId);
                closeMenu(menu, menuContent);
            }
        }
        
        // Delete butonu tıklaması
        if (e.target.closest('.delete-btn')) {
            const chatId = menu.dataset.chatId;
            if (chatId) {
                deleteChatConfirm(chatId);
                closeMenu(menu, menuContent);
            }
        }
    });
}

// Sayfa yüklendiğinde menü işlemlerini başlat
document.addEventListener('DOMContentLoaded', setupMenuListeners);

function createChatItem(chat) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.dataset.chatId = chat.id; // data-chat-id attribute'unu ekle
    
    const chatContent = document.createElement('div');
    chatContent.className = 'chat-content';
    chatContent.innerHTML = `<span>${chat.name}</span>`;
    chatContent.onclick = () => loadChat(chat.id);
    
    const detailButton = document.createElement('button');
    detailButton.className = 'detay-btn';
    detailButton.innerHTML = '⋮';
    detailButton.onclick = (e) => {
        e.stopPropagation();
        toggleChatMenu(chat.id);
    };

    chatItem.appendChild(chatContent);
    chatItem.appendChild(detailButton);
    
    return chatItem;
}

function closeMenu(menu, menuContent) {
    menu.classList.remove('active');
    menuContent.classList.remove('show');
    setTimeout(() => {
        menu.style.display = 'none';
    }, 300);
}

// Sayfa herhangi bir yerine tıklandığında menüyü kapat
document.addEventListener('click', (e) => {
    const menu = document.querySelector('.floating-menu');
    const menuContent = menu?.querySelector('.menu-content');
    const detayBtn = e.target.closest('.detay-btn');
    
    if (!detayBtn && menu && menu.classList.contains('active')) {
        closeMenu(menu, menuContent);
    }
});


function loadChat(chatId) {
    currentChatId = chatId;

    // Sohbet mesajlarını yükle
    fetch(`/chat/${chatId}/messages`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error(data.error);
            return;
        }

        const chatMessages = document.querySelector('.chat-messages');
        chatMessages.innerHTML = ''; // Mevcut mesajları temizle

        // Mesajları ekrana ekle
        data.forEach(msg => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${msg.role}-message`;
            messageElement.innerHTML = `<p>${msg.content}</p>`;
            chatMessages.appendChild(messageElement);
        });

        // Scroll'u en alta taşı
        chatMessages.scrollTop = chatMessages.scrollHeight;
    })
    .catch(error => {
        console.error('Hata:', error);
    });
}

function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();

    if (!message) return;

    // Eğer currentChatId yoksa, yeni bir sohbet başlat
    if (!currentChatId) {
        startNewChat();
        return;
    }

    const chatMessages = document.querySelector('.chat-messages');

    // Kullanıcı mesajını ekrana ekle
    const userMessageElement = document.createElement('div');
    userMessageElement.className = 'message user-message';
    userMessageElement.innerHTML = `<p>${message}</p>`;
    chatMessages.appendChild(userMessageElement);

    // Mesajı API'ye gönder
    fetch(`/chat/${currentChatId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error(data.error);
            return;
        }

        // AI yanıtını maddeler halinde ekrana ekle
        const aiMessageElement = document.createElement('div');
        aiMessageElement.className = 'message ai-message';

        // AI yanıtını parçalara ayır (her satır bir madde)
        const items = data.content.split('\n').filter(item => item.trim() !== '');

        // Liste oluştur
        const list = document.createElement('ul');
        items.forEach(item => {
            const listItem = document.createElement('li');
            listItem.textContent = item.trim(); // Maddeyi ekle
            list.appendChild(listItem);
        });

        // Listeyi AI mesajına ekle
        aiMessageElement.appendChild(list);
        chatMessages.appendChild(aiMessageElement);

        // Scroll'u en alta taşı
        chatMessages.scrollTop = chatMessages.scrollHeight;
    })
    .catch(error => {
        console.error('Hata:', error);
    });

    // Input alanını temizle
    chatInput.value = '';
}
// Mesaj Ekleme
function addMessage(type, content) {
    const chat = state.chats.find(c => c.id === state.currentChatId);
    if (!chat) return;

    const message = {
        id: Date.now(),
        type,
        content,
        timestamp: new Date()
    };

    chat.messages.push(message);
    renderMessage(message);
}

function handleKeyDown(event) {
    // Eğer Shift + Enter kombinasyonu kullanılırsa, yeni bir satır ekle
    if (event.key === 'Enter' && event.shiftKey) {
        return; // Varsayılan davranışı koru
    }

    // Sadece Enter tuşuna basıldığında mesaj gönder
    if (event.key === 'Enter') {
        event.preventDefault(); // Enter tuşunun varsayılan davranışını engelle
        sendMessage(); // Mesaj gönderme fonksiyonunu çağır
    }
}

// Mesaj Render Etme
function renderMessage(message) {
    const messagesContainer = document.querySelector('.chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${message.type} animate__animated animate__fadeInUp`;

    messageDiv.innerHTML = `
${message.content}
<div class="message-actions">
    <button class="action-btn" onclick="copyMessage(${message.id})">
        <i class="fas fa-copy"></i>
    </button>
</div>
`;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';  // Önce mevcut yüksekliği sıfırlar
    textarea.style.height = (textarea.scrollHeight) + 'px';  // İçeriğe göre yeniden ayarlar
}


const chatInput = document.getElementById('chatInput');
chatInput.addEventListener('input', function () {
    chatInput.style.height = 'auto';
    chatInput.style.height = chatInput.scrollHeight + 'px';
});

//Sohbet Oluşturma
let currentChatId = null; // Mevcut sohbetin ID'sini saklamak için global bir değişken

function startNewChat() {
    fetch('/chat/new', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error(data.error);
            return;
        }

        // Yeni sohbetin ID'sini güncelle
        currentChatId = data.chat_id;

        // Sohbet listesini yeniden yükle
        loadChatList();

        // Chat alanını temizle
        const chatMessages = document.querySelector('.chat-messages');
        chatMessages.innerHTML = '';

    })
    .catch(error => {
        console.error('Hata:', error);
    });
}

function toggleVoiceInput() {
    if (!state.recognition) {
        initializeVoiceRecognition();
    }

    if (state.isVoiceInputActive) {
        state.recognition.stop();
        state.isVoiceInputActive = false;
    } else {
        state.recognition.start();
        state.isVoiceInputActive = true;
    }
}


// Ses Tanıma Başlatma
function initializeVoiceRecognition() {
    if ('webkitSpeechRecognition' in window) {
        state.recognition = new webkitSpeechRecognition();
        state.recognition.continuous = true;
        state.recognition.interimResults = true;
        state.recognition.lang = 'tr-TR';

        state.recognition.onresult = (event) => {
            const input = document.querySelector('.input-field');
            input.value = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
        };
    }
}


function toggleOptionsMenu(event, chatId) {
    event.stopPropagation(); // Tıklamayı sohbet yükleme olayından ayır
    const optionsMenu = event.target.closest('.chat-item').querySelector('.options-menu');
    const allMenus = document.querySelectorAll('.options-menu');

    // Diğer açık menüleri kapat
    allMenus.forEach(menu => {
        if (menu !== optionsMenu) {
            menu.classList.remove('active');
        }
    });

    // Bu menüyü aç/kapat
    optionsMenu.classList.toggle('active');
}



// Sayfanın herhangi bir yerine tıklandığında menüyü kapat
document.addEventListener('click', () => {
    const allMenus = document.querySelectorAll('.options-menu');
    allMenus.forEach(menu => menu.classList.remove('active'));
});

function attachFile() {
    try {
        // Input elementi oluştur
        const input = document.createElement('input');
        input.type = 'file';

        // Dosya seçim değişikliğini dinle
        input.addEventListener('change', function (e) {
            const file = e.target.files[0];

            if (file) {
                // Dosya boyutu kontrolü (20MB)
                const maxSize = 20 * 1024 * 1024;
                if (file.size > maxSize) {
                    showNotification('Dosya boyutu 20MB\'dan küçük olmalıdır!', 'error');
                    return;
                }

                // Dosya türüne göre işlem yap
                if (file.type.startsWith('image/')) {
                    handleImageFile(file);
                } else if (file.type.startsWith('video/')) {
                    handleVideoFile(file);
                } else {
                    handleOtherFile(file);
                }
            }

            // Input'u temizle
            input.value = '';
        });

        // Dosya seçim penceresini aç
        input.click();

    } catch (error) {
        console.error('Dosya yükleme hatası:', error);
        showNotification('Dosya yüklenirken bir hata oluştu!', 'error');
    }
}

// Resim dosyalarını işle
function handleImageFile(file) {
    const reader = new FileReader();

    reader.onload = function (e) {
        const imageContent = `
            <div class="file-message">
                <img src="${e.target.result}" alt="${file.name}" class="uploaded-image">
                <div class="file-info">
                    <span>${file.name}</span>
                    <span>${formatFileSize(file.size)}</span>
                </div>
            </div>
        `;
        addMessage('user', imageContent);
        showNotification('Resim başarıyla yüklendi!', 'success');
    };

    reader.onerror = () => showNotification('Dosya yüklenirken hata oluştu!', 'error');
    reader.readAsDataURL(file);
}

// Video dosyalarını işle
function handleVideoFile(file) {
    const reader = new FileReader();

    reader.onload = function (e) {
        const videoContent = `
            <div class="file-message">
                <video controls class="uploaded-video">
                    <source src="${e.target.result}" type="${file.type}">
                    Tarayıcınız video elementini desteklemiyor.
                </video>
                <div class="file-info">
                    <span>${file.name}</span>
                    <span>${formatFileSize(file.size)}</span>
                </div>
            </div>
        `;
        addMessage('user', videoContent);
        showNotification('Video başarıyla yüklendi!', 'success');
    };

    reader.onerror = () => showNotification('Dosya yüklenirken hata oluştu!', 'error');
    reader.readAsDataURL(file);
}

// Diğer dosya türlerini işle
function handleOtherFile(file) {
    // Dosya tipine göre icon seç
    const fileIcon = getFileIcon(file.type);

    const fileContent = `
        <div class="file-message">
            <div class="file-container">
                <i class="${fileIcon}"></i>
                <div class="file-info">
                    <span>${file.name}</span>
                    <span>${formatFileSize(file.size)}</span>
                </div>
            </div>
        </div>
    `;

    addMessage('user', fileContent);
    showNotification('Dosya başarıyla yüklendi!', 'success');
}

// Dosya boyutunu formatla
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Dosya tipine göre icon seç
function getFileIcon(fileType) {
    if (fileType.includes('pdf')) return 'fas fa-file-pdf';
    if (fileType.includes('word') || fileType.includes('document')) return 'fas fa-file-word';
    if (fileType.includes('excel') || fileType.includes('sheet')) return 'fas fa-file-excel';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'fas fa-file-powerpoint';
    if (fileType.includes('zip') || fileType.includes('archive')) return 'fas fa-file-archive';
    if (fileType.includes('text')) return 'fas fa-file-alt';
    if (fileType.includes('code')) return 'fas fa-file-code';
    return 'fas fa-file';
}


function saveEdit(chatId, input, titleElement) {
    // Yeni başlığı al
    const newTitle = input.value.trim();

    // Eğer başlık boşsa eski başlığa geri dön
    if (newTitle === '') {
        input.remove();
        titleElement.style.display = 'block';
        return;
    }

    // State'i güncelle
    const chat = state.chats.find(c => c.id === chatId);
    if (chat) {
        chat.title = newTitle;
    }

    // HTML'deki başlığı güncelle
    titleElement.textContent = newTitle;
    titleElement.style.display = 'block';

    // Input'u kaldır
    input.remove();
}

function toggleSettings() {
    const modal = document.getElementById('settingsModal');
    const modalContent = modal.querySelector('.modal-content');

    if (modal.style.display === 'flex') {
        modalContent.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    } else {
        modal.style.display = 'flex';
        setTimeout(() => {
            modalContent.classList.add('show');
        }, 10);
    }
}

// Dark Mode Fonksiyonu
function toggleTheme() {
    document.body.classList.toggle('dark-mode');

    // Tema tercihini localStorage'a kaydet
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);

    // Tema iconunu güncelle
    const themeButton = document.querySelector('.action-btn i');
    themeButton.classList.toggle('fa-moon');
    themeButton.classList.toggle('fa-sun');
}

// Sayfa yüklendiğinde tema tercihini kontrol et
function checkThemePreference() {
    const savedDarkMode = localStorage.getItem('darkMode');

    if (savedDarkMode === 'true') {
        document.body.classList.add('dark-mode');

        // Icon'u güncelle
        const themeButton = document.querySelector('.action-btn i');
        themeButton.classList.remove('fa-moon');
        themeButton.classList.add('fa-sun');
    }
}

// Sayfa yüklendiğinde tema tercihini kontrol et
document.addEventListener('DOMContentLoaded', checkThemePreference);

// Sayfa Uyarısı
function clearMessages() {
    const chatMessages = document.querySelector('.chat-messages');
    chatMessages.innerHTML = `
        <div class="welcome-message">
            <h2>Hoş Geldiniz! 👋</h2>
            <p>Yeni bir sohbet başlatmak için sol üstteki "Yeni Sohbet" butonunu kullanabilirsiniz.</p>
            <p>Sohbetlerinizdeki mesajları silmek için ve sohbetin ismini düzenlemek için sohbetlerin yanındaki menüyü kullanabilirsiniz.</p>
        </div>
    `;
}

// Sayfa Yüklendiğinde dark mode'u kontrol et
document.addEventListener('DOMContentLoaded', () => {
    if (state.darkMode) {
        document.body.classList.add('dark');
    }
    clearMessages(); // Hoş geldiniz mesajını göster
});


// Sayfa sidebar menüsünü açma/kapatma
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const menuIcon = document.querySelector('.menu-btn i');

    sidebar.classList.toggle('collapsed');

    // Menü ikonunu değiştir (kapalıyken bars, açıkken times)
    if (sidebar.classList.contains('collapsed')) {
        menuIcon.classList.remove('fa-times');
        menuIcon.classList.add('fa-bars');
    } else {
        menuIcon.classList.remove('fa-bars');
        menuIcon.classList.add('fa-times');
    }
}

let settingsState = {
    darkMode: false,
    autoRead: false,
    fontSize: 'medium',
    soundNotifications: false
};


function loadSettings() {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
        settingsState = JSON.parse(savedSettings);
        updateSettingsUI();
    }
}


function updateSettingsUI() {
    document.getElementById('darkModeToggle').checked = settingsState.darkMode;
    document.getElementById('autoReadToggle').checked = settingsState.autoRead;
    document.getElementById('fontSizeSelect').value = settingsState.fontSize;
    document.getElementById('soundToggle').checked = settingsState.soundNotifications;
}


function openSettings() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'block';
    loadSettings();
}


function closeSettings() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'none';
}


function saveSettings() {
    settingsState = {
        darkMode: document.getElementById('darkModeToggle').checked,
        autoRead: document.getElementById('autoReadToggle').checked,
        fontSize: document.getElementById('fontSizeSelect').value,
        soundNotifications: document.getElementById('soundToggle').checked
    };

    localStorage.setItem('appSettings', JSON.stringify(settingsState));
    applySettings();
    showNotification('Ayarlar kaydedildi!', 'success');
    closeSettings();
}

function applySettings() {
    // Dark mode
    document.body.classList.toggle('dark-mode', settingsState.darkMode);

    // Font size
    document.body.style.fontSize = {
        small: '14px',
        medium: '16px',
        large: '18px'
    }[settingsState.fontSize];

    // Auto read
    state.isAutoReadActive = settingsState.autoRead;
}

window.onclick = function (event) {
    const modal = document.getElementById('settingsModal');
    if (event.target === modal) {
        closeSettings();
    }
}

// Initialize settings when page loads
document.addEventListener('DOMContentLoaded', loadSettings);


// Sohbeti silme fonksiyonu
function deleteChatConfirmed(chatId) {
    fetch(`/chat/${chatId}/delete`, {
        method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error(data.error);
            return;
        }
        loadChatList(); // Sohbet listesini yeniden yükle
    })
    .catch(error => {
        console.error('Hata:', error);
    });
}

 // Sayfa yüklendiğinde önerilen soruları göster
 document.addEventListener('DOMContentLoaded', () => {
    addSuggestedQuestions();
});

// Önerilen soruları ekleyen fonksiyon
function addSuggestedQuestions() {
    // Eğer zaten önerilen sorular varsa, kaldır (tekrar tekrar eklememek için)
    const existingSuggestions = document.querySelector('.suggested-questions');
    if (existingSuggestions) {
        existingSuggestions.remove();
    }

    // Önerilen sorular için container oluştur
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'suggested-questions';

    // Örnek sorular
    const questions = [
        'Html Öğrenme?',
        'Python Öğrenme?', 
        'Üniversite Hazırlanma?', 
        'Kas Kütlesi Kazanma?'
    ];

    // Her soru için bir buton oluştur
    questions.forEach(question => {
        const button = document.createElement('button');
        button.className = 'suggested-question-btn';
        button.textContent = question; // Kullanıcıya gösterilen metin

        // AI için gizli mesaj ekle
        const hiddenMessage = "10 adımda "; // Kullanıcıya gösterilmeyen mesaj

        // Butona tıklandığında arka planda AI ile iletişim kur
        button.addEventListener('click', () => {
            const input = document.querySelector('.input-field'); // textarea veya input
            input.value = question; // Kullanıcıya sadece soruyu göster
            input.focus(); // Odaklan

            // Arka planda AI'ya gizli mesajı gönder
            sendMessageToAI(hiddenMessage + question);
        });

        suggestionsContainer.appendChild(button);
    });

    // Önerilen soruları input-area div'inin içine ekle
    const inputArea = document.querySelector('.input-area');
    inputArea.prepend(suggestionsContainer); // prepend ile en üste ekler
}

// Arka planda AI'ya mesaj gönderme fonksiyonu
// AI'dan gelen yanıtı maddelere ayır ve ekranda göster
function formatTextWithHeadings(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<span class="heading">$1</span>');
}


function formatAIResponse(response) {

    let items = response.split('\n').filter(item => item.trim() !== '');

    
    while (items.length < 10) {
        items.push(`Madde ${items.length + 1}: (Bu madde AI tarafından sağlanmadı)`);
    }


    return items.slice(0, 10);
}


function displayAIResponse(response) {
    const chatMessages = document.querySelector('.chat-messages');

    // AI yanıtını maddeler halinde ekrana ekle
    const aiMessageElement = document.createElement('div');
    aiMessageElement.className = 'message ai-message';

    // Yanıtı 10 maddeye tamamla
    const items = formatAIResponse(response);

    // Liste oluştur
    const list = document.createElement('ol'); // Sıralı liste (1. 2. 3. ...)
    items.forEach(item => {
        const listItem = document.createElement('li');
        listItem.innerHTML = formatTextWithBold(item.trim()); // Metni formatla ve ekle
        list.appendChild(listItem);
    });

    // Listeyi AI mesajına ekle
    aiMessageElement.appendChild(list);
    chatMessages.appendChild(aiMessageElement);

    // Scroll'u en alta taşı
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessageToAI(message, chatId) {
    try {
        const response = await fetch(`/chat/${chatId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });
        const data = await response.json();
        console.log('AI Response:', data);
        displayAIResponse(data.content); // Dönen verideki "content" alanını kullanın
    } catch (error) {
        console.error('API Error:', error);
    }
}



// Gönder butonuna tıklama olayını ekle
document.querySelector('.send-button').addEventListener('click', sendMessage);

// Enter tuşuna basıldığında mesaj gönderme
document.querySelector('.input-field').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Hedefler için veri modeli
let goals = JSON.parse(localStorage.getItem('goals')) || [];

// Hedeflerim sayfasını gösterme
function showGoals() {
    const goalsPage = document.getElementById('goalsPage');
    goalsPage.classList.add('active');
    renderGoals();
}

// Hedeflerim sayfasını gizleme
function hideGoals() {
    const goalsPage = document.getElementById('goalsPage');
    goalsPage.classList.remove('active');
}

// Hedefleri render etme
function renderGoals() {
    const goalsList = document.getElementById('goalsList');
    const noGoalsMessage = document.getElementById('noGoalsMessage');
    
    // Hedef listesini temizle
    goalsList.innerHTML = '';
    
    if (goals.length === 0) {
        noGoalsMessage.style.display = 'flex';
        return;
    }
    
    noGoalsMessage.style.display = 'none';
    
    // Hedefleri render et
    goals.forEach((goal, goalIndex) => {
        // Tamamlanan adımların sayısını hesapla
        const completedSteps = goal.steps.filter(step => step.completed).length;
        const progress = goal.steps.length > 0 ? Math.round((completedSteps / goal.steps.length) * 100) : 0;
        
        const goalItem = document.createElement('li');
        goalItem.className = 'goal-item';
        goalItem.innerHTML = `
            <div class="goal-header" onclick="toggleGoalSteps(${goalIndex})">
                <div class="goal-title">
                    <i class="fas fa-bullseye"></i>
                    ${goal.title}
                </div>
                <div class="goal-date">${goal.date}</div>
            </div>
            <div class="goal-progress">
                <div class="goal-progress-bar" style="width: ${progress}%"></div>
            </div>
            <div class="goal-steps" id="goalSteps-${goalIndex}">
                ${goal.steps.map((step, stepIndex) => `
                    <div class="goal-step">
                        <input type="checkbox" class="goal-step-checkbox" 
                               id="step-${goalIndex}-${stepIndex}" 
                               ${step.completed ? 'checked' : ''}
                               onchange="toggleStepCompletion(${goalIndex}, ${stepIndex})">
                        <label class="goal-step-text" for="step-${goalIndex}-${stepIndex}">
                            ${step.text}
                        </label>
                    </div>
                `).join('')}
            </div>
        `;
        
        goalsList.appendChild(goalItem);
    });
}

// Hedef adımlarını göster/gizle
function toggleGoalSteps(goalIndex) {
    const goalSteps = document.getElementById(`goalSteps-${goalIndex}`);
    goalSteps.classList.toggle('active');
}

// Adım tamamlama durumunu değiştir
function toggleStepCompletion(goalIndex, stepIndex) {
    goals[goalIndex].steps[stepIndex].completed = !goals[goalIndex].steps[stepIndex].completed;
    saveGoals();
    renderGoals();
}

// Yeni hedef ekleme formunu göster
function addNewGoal() {
    const modal = document.createElement('div');
    modal.className = 'add-goal-modal active';
    modal.innerHTML = `
        <div class="add-goal-form">
            <h3><i class="fas fa-plus-circle"></i> Yeni Hedef Ekle</h3>
            
            <div class="form-group">
                <label for="goalTitle">Hedef Başlığı</label>
                <input type="text" id="goalTitle" placeholder="Hedef başlığını girin">
            </div>
            
            <div class="form-group">
                <label>Adımlar</label>
                <div class="steps-container" id="stepsContainer">
                    <div class="step-input-group">
                        <input type="text" class="step-input" placeholder="Adım 1">
                        <button type="button" onclick="removeStepInput(this)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <button type="button" class="add-step-btn" onclick="addStepInput()">
                    <i class="fas fa-plus"></i> Adım Ekle
                </button>
            </div>
            
            <div class="form-buttons">
                <button type="button" class="cancel-goal-btn" onclick="closeAddGoalModal()">İptal</button>
                <button type="button" class="save-goal-btn" onclick="saveNewGoal()">Kaydet</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Adım input alanı ekle
function addStepInput() {
    const stepsContainer = document.getElementById('stepsContainer');
    const stepCount = stepsContainer.children.length + 1;
    
    const stepGroup = document.createElement('div');
    stepGroup.className = 'step-input-group';
    stepGroup.innerHTML = `
        <input type="text" class="step-input" placeholder="Adım ${stepCount}">
        <button type="button" onclick="removeStepInput(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    stepsContainer.appendChild(stepGroup);
}

// Adım input alanını kaldır
function removeStepInput(button) {
    const stepGroup = button.parentElement;
    const stepsContainer = stepGroup.parentElement;
    
    stepsContainer.removeChild(stepGroup);
    
    // Adım numaralarını güncelle
    const stepInputs = stepsContainer.querySelectorAll('.step-input');
    stepInputs.forEach((input, index) => {
        input.placeholder = `Adım ${index + 1}`;
    });
}

// Hedef ekleme modalını kapat
function closeAddGoalModal() {
    const modal = document.querySelector('.add-goal-modal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Yeni hedefi kaydet
function saveNewGoal() {
    const titleInput = document.getElementById('goalTitle');
    const stepInputs = document.querySelectorAll('.step-input');
    
    const title = titleInput.value.trim();
    if (!title) {
        alert('Lütfen bir hedef başlığı girin.');
        return;
    }
    
    const steps = [];
    stepInputs.forEach(input => {
        const stepText = input.value.trim();
        if (stepText) {
            steps.push({
                text: stepText,
                completed: false
            });
        }
    });
    
    if (steps.length === 0) {
        alert('Lütfen en az bir adım ekleyin.');
        return;
    }
    
    // Yeni hedefi oluştur
    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate()}.${currentDate.getMonth() + 1}.${currentDate.getFullYear()}`;
    
    const newGoal = {
        title,
        steps,
        date: formattedDate,
        chatId: currentChatId || null // Eğer aktif bir sohbet varsa, onun ID'sini ekle
    };
    
    goals.push(newGoal);
    saveGoals();
    renderGoals();
    closeAddGoalModal();
}

// Hedefleri kaydet
function saveGoals() {
    localStorage.setItem('goals', JSON.stringify(goals));
}

// Sohbette belirlenen hedefi Hedeflerim'e ekle
function addGoalFromChat(title, steps) {
    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate()}.${currentDate.getMonth() + 1}.${currentDate.getFullYear()}`;
    
    const stepsArray = steps.map(step => ({
        text: step,
        completed: false
    }));
    
    const newGoal = {
        title,
        steps: stepsArray,
        date: formattedDate,
        chatId: currentChatId
    };
    
    goals.push(newGoal);
    saveGoals();
    
    // Bildirim göster
    showNotification('Hedef başarıyla eklendi!', 'info');
}

// Sohbet içinde "10 adım" ifadesini içeren mesajları dinleyip hedef olarak kaydetmek için
// Bu fonksiyon, AI yanıtını işledikten sonra çağrılmalıdır
function checkForGoals(aiMessage) {
    // "10 adım" içeren mesajları kontrol et
    if (aiMessage.toLowerCase().includes("10 adım")) {
        const lines = aiMessage.split('\n');
        
        // Başlık olabilecek satırı bul (genellikle ilk satır veya "10 adım" içeren satır)
        let title = "";
        let titleIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes("10 adım")) {
                title = lines[i].trim();
                titleIndex = i;
                break;
            }
        }
        
        if (titleIndex === -1 && lines.length > 0) {
            title = lines[0].trim();
            titleIndex = 0;
        }
        
        // Adımları topla (1., 2., vb. ile başlayan satırlar)
        const steps = [];
        const stepRegex = /^\s*(\d+)[.)]\s+(.+)$/;
        
        for (let i = titleIndex + 1; i < lines.length; i++) {
            const match = lines[i].match(stepRegex);
            if (match) {
                steps.push(match[2].trim());
            }
        }
        
        // Eğer 10 adım bulunduysa hedefi ekle
        if (steps.length > 0) {
            // Kullanıcıya sor
            if (confirm(`"${title}" hedefini Hedeflerim sayfasına eklemek ister misiniz?`)) {
                addGoalFromChat(title, steps);
            }
        }
    }
}

// Mevcut sohbet fonksiyonlarına entegrasyon
// sendMessage fonksiyonuna eklenecek parça:
function addGoalDetectionToChat() {
    // Orjinal sendMessage fonksiyonunu sakla
    const originalSendMessage = window.sendMessage;
    
    // sendMessage fonksiyonunu yeniden tanımla
    window.sendMessage = function() {
        // Orjinal fonksiyonu çağır
        originalSendMessage.apply(this, arguments);
        
        // AI yanıtını kontrol etmek için son mesaja bir gözlemci ekle
        setTimeout(() => {
            const chatMessages = document.querySelector('.chat-messages');
            const lastAIMessage = chatMessages.querySelector('.message.ai-message:last-child');
            
            if (lastAIMessage) {
                checkForGoals(lastAIMessage.textContent);
            }
        }, 1000); // AI'ın yanıt vermesi için biraz bekle
    };
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    // Hedeflerim işlevselliğini başlat
    addGoalDetectionToChat();
    
    // Mevcut sohbetlere Hedeflerim butonunu ekle
    const chatList = document.querySelector('.chat-list');
    const newChatBtn = chatList.querySelector('.new-chat-btn');
    
    const goalsBtn = document.createElement('button');
    goalsBtn.className = 'goals-btn';
    goalsBtn.innerHTML = '<i class="fas fa-bullseye"></i><span>Hedeflerim</span>';
    goalsBtn.onclick = showGoals;
    
    chatList.insertBefore(goalsBtn, newChatBtn.nextSibling);
    
    // Hedeflerim sayfasını oluştur
    const goalsPage = document.createElement('div');
    goalsPage.id = 'goalsPage';
    goalsPage.className = 'goals-page';
    goalsPage.innerHTML = `
        <div class="goals-content">
            <div class="goals-header">
                <h2><i class="fas fa-bullseye"></i> Hedeflerim</h2>
                <button class="close-btn" onclick="hideGoals()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="goals-content">
                <div class="no-goals-message" id="noGoalsMessage">
                    <i class="fas fa-clipboard-list"></i>
                    <p>Henüz hedef eklenmemiş. Sohbetlerinizde belirlediğiniz hedefler burada listelenecektir.</p>
                </div>
                
                <ul class="goals-list" id="goalsList">
                    <!-- Hedefler JavaScript ile buraya eklenecek -->
                </ul>
            </div>
            
            <div class="goals-footer">
                <button class="add-goal-btn" onclick="addNewGoal()">
                    <i class="fas fa-plus"></i> Yeni Hedef Ekle
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(goalsPage);
});

// Bildirim gösterme fonksiyonu
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animasyon ekle
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Bildirimi kaldır
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// CSS için ek bildirim stilleri
const notificationStyles = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 1rem;
    max-width: 300px;
    z-index: 2000;
    transform: translateX(100%);
    opacity: 0;
    transition: transform 0.3s ease, opacity 0.3s ease;
}

.notification.show {
    transform: translateX(0);
    opacity: 1;
}

.notification.info {
    border-left: 4px solid var(--info);
}

.notification.success {
    border-left: 4px solid var(--success);
}

.notification.warning {
    border-left: 4px solid var(--warning);
}

.notification.error {
    border-left: 4px solid var(--danger);
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 10px;
}

.notification-content i {
    font-size: 1.5rem;
}

.notification.info i {
    color: var(--info);
}

.notification.success i {
    color: var(--success);
}

.notification.warning i {
    color: var(--warning);
}

.notification.error i {
    color: var(--danger);
}

body.dark-mode .notification {
    background: #2c2c2c;
    color: #e0e0e0;
}
`;

// Stil ekle
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = notificationStyles;
    document.head.appendChild(style);
});


// Yapay zeka yanıtını analiz edip hedefi kaydetme
function saveGoalFromAIMessage(aiMessage) {
    // "10 adım" içeren mesajları kontrol et
    if (aiMessage.toLowerCase().includes("10 adım")) {
        const lines = aiMessage.split('\n');
        
        // Başlık olabilecek satırı bul (genellikle ilk satır veya "10 adım" içeren satır)
        let title = "";
        let titleIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes("10 adım")) {
                title = lines[i].trim();
                titleIndex = i;
                break;
            }
        }
        
        if (titleIndex === -1 && lines.length > 0) {
            title = lines[0].trim();
            titleIndex = 0;
        }
        
        // Adımları topla (1., 2., vb. ile başlayan satırlar)
        const steps = [];
        const stepRegex = /^\s*(\d+)[.)]\s+(.+)$/;
        
        for (let i = titleIndex + 1; i < lines.length; i++) {
            const match = lines[i].match(stepRegex);
            if (match) {
                steps.push(match[2].trim());
            }
        }
        
        // Eğer 10 adım bulunduysa hedefi ekle
        if (steps.length > 0) {
            // Kullanıcıya sor
            if (confirm(`"${title}" hedefini Hedeflerim sayfasına eklemek ister misiniz?`)) {
                addGoalFromChat(title, steps);
            }
        }
    }
}

// Hedefi Hedeflerim sayfasına ekle
function addGoalFromChat(title, steps) {
    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate()}.${currentDate.getMonth() + 1}.${currentDate.getFullYear()}`;
    
    const stepsArray = steps.map(step => ({
        text: step,
        completed: false
    }));
    
    const newGoal = {
        title,
        steps: stepsArray,
        date: formattedDate,
        chatId: currentChatId
    };
    
    goals.push(newGoal);
    saveGoals();
    renderGoals();
    
    // Bildirim göster
    showNotification('Hedef başarıyla eklendi!', 'info');
}
