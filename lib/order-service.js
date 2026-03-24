/**
 * Giá đơn hàng lấy từ content course (VND). Thiếu hoặc không hợp lệ → 0 (demo).
 */
function priceVndFromCourse(course) {
  if (!course || course.priceVnd === undefined || course.priceVnd === null) {
    return 0;
  }
  const n = Number(course.priceVnd);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

module.exports = {
  priceVndFromCourse,
};
