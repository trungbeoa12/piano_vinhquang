/**
 * Bản đồ URL thật cho học liệu (Drive / PDF / link).
 *
 * QUAN TRỌNG:
 * - File này không được nhúng vào trang marketing công khai; chỉ load động sau khi xác thực + có quyền khóa học.
 * - Site tĩnh: người dùng vẫn có thể tải file .js nếu biết đường dẫn. Môi trường thật cần backend cấp URL có chữ ký / token.
 *
 * Các URL dưới đây là ví dụ minh họa (placeholder) — thay bằng link Drive thật sau khi triển khai.
 */
window.PVQ_PRIVATE_RESOURCE_URLS = {
  'pvq-pcb-l01-vid': {
    type: 'drive_video',
    url: 'https://drive.google.com/file/d/REPLACE_WITH_REAL_FILE_ID/preview',
  },
  'pvq-pcb-l01-sheet': {
    type: 'drive_sheet',
    url: 'https://drive.google.com/file/d/REPLACE_WITH_REAL_FILE_ID/view',
  },
  'pvq-pcb-l02-vid': {
    type: 'drive_video',
    url: 'https://drive.google.com/file/d/REPLACE_WITH_REAL_FILE_ID/preview',
  },
  'pvq-pcb-l02-pdf': {
    type: 'pdf',
    url: 'https://drive.google.com/file/d/REPLACE_WITH_REAL_FILE_ID/view',
  },
  'pvq-dh-l01-vid': {
    type: 'drive_video',
    url: 'https://drive.google.com/file/d/REPLACE_WITH_REAL_FILE_ID/preview',
  },
  'pvq-dh-l01-sheet': {
    type: 'drive_sheet',
    url: 'https://drive.google.com/file/d/REPLACE_WITH_REAL_FILE_ID/view',
  },
};
