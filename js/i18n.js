const translations = {
    'vi': {
        // index.html
        'home_title': 'Room Decoration',
        'home_desc': 'Thiết kế không gian mơ ước của bạn với đồ họa 3D. Thỏa sức sáng tạo, khám phá và trực quan hóa ý tưởng dễ dàng.',
        'btn_new': 'Dự án mới',
        'btn_saved': 'Dự án sẵn có',
        'btn_settings': 'Cài đặt',
        'btn_lang': 'Ngôn ngữ',
        'modal_settings': 'Cài đặt giao diện',
        'btn_light': 'Sáng',
        'btn_dark': 'Tối',
        'modal_lang': 'Chọn ngôn ngữ',
        'lang_vi': 'Tiếng Việt',
        'lang_en': 'Tiếng Anh',

        // upload.html
        'upload_title': 'Tải lên bản thiết kế',
        'upload_desc': 'Chọn file .glb dự án của bạn để tiếp tục chỉnh sửa',
        'upload_drop': 'Kéo thả file .glb vào đây',
        'upload_or': 'hoặc click để chọn file',
        'upload_loading': 'Đang tải dữ liệu...',
        'upload_back': '← Quay lại trang chủ',

        // editor.html
        'editor_search': 'Tìm kiếm nội thất...',
        'cat_furnitures': '🛋️ Nội thất',
        'cat_decorations': '🪴 Trang trí',
        'cat_things': '🛋️ Vật dụng',
        'cat_doors': '🚪 Cửa & Cửa sổ',
        'cat_wallpapers': '🎨 Giấy dán tường',
        'cat_floors': '🌿 Sàn nhà',
        'cat_bg': '🌌 Phong cảnh',
        'view_2d': 'Góc nhìn 2D (Từ trên xuống)',
        'view_3d': 'Xem trước 3D',
        'tool_move': '⬌ Di chuyển',
        'tool_rotate': '↻ Xoay',
        'tool_scale': '⤡ Kích thước',
        'tool_undo': '↩ Hoàn tác',
        'tool_redo': '↪ Làm lại',
        'tool_save': '💾 Lưu',
        'tool_preview': '🎥 Xem trước',
        'tool_newroom': '✨ Phòng mới',
        'tool_delete': '❌ Xóa',
        'tool_help': 'ℹ️ Hướng dẫn',
        'lbl_bg': 'Nền:',
        'btn_back_home': '🏠 Về trang chủ',
        'btn_close_preview': '✕ Đóng Preview'
    },
    'en': {
        // index.html
        'home_title': 'Room Decoration',
        'home_desc': 'Design your dream space in stunning 3D. Create, explore, and visualize your ideas with ease.',
        'btn_new': 'New Project',
        'btn_saved': 'Saved Projects',
        'btn_settings': 'Settings',
        'btn_lang': 'Language',
        'modal_settings': 'Theme Settings',
        'btn_light': 'Light',
        'btn_dark': 'Dark',
        'modal_lang': 'Select Language',
        'lang_vi': 'Vietnamese',
        'lang_en': 'English',

        // upload.html
        'upload_title': 'Upload Project',
        'upload_desc': 'Select your .glb project file to continue editing',
        'upload_drop': 'Drag and drop .glb file here',
        'upload_or': 'or click to browse',
        'upload_loading': 'Loading data...',
        'upload_back': '← Back to Home',

        // editor.html
        'editor_search': 'Search objects...',
        'cat_furnitures': '🛋️ Furnitures',
        'cat_decorations': '🪴 Decorations',
        'cat_things': '🛋️ Things',
        'cat_doors': '🚪 Doors & Windows',
        'cat_wallpapers': '🏠 Wallpapers',
        'cat_floors': '🌿 Floor',
        'cat_bg': '🌌 Background',
        'view_2d': '2D Top-down View',
        'view_3d': '3D Preview',
        'tool_move': '⬌ Move',
        'tool_rotate': '↻ Rotate',
        'tool_scale': '⤡ Scale',
        'tool_undo': '↩ Undo',
        'tool_redo': '↪ Redo',
        'tool_save': '💾 Save',
        'tool_preview': '🎥 Preview',
        'tool_newroom': '🏠 New Room',
        'tool_delete': '❌ Delete',
        'tool_help': 'ℹ️ Help',
        'lbl_bg': 'Bg:',
        'btn_back_home': '🏠 Back to Home',
        'btn_close_preview': '✕ Close Preview'
    }
};

window.applyLanguage = function () {
    const lang = 'vi';
    const dict = translations[lang];
    if (!dict) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                el.setAttribute('placeholder', dict[key]);
            } else {
                el.innerHTML = dict[key];
            }
        }
    });
}

// Tự động chạy khi file load
window.applyLanguage();
