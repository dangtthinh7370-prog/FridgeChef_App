export function validateCredentials(email, password, registering = false, confirmation = '') {
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Nhập địa chỉ email hợp lệ.');
  if (!password) throw new Error('Nhập mật khẩu.');
  if (registering && password.length < 8) throw new Error('Mật khẩu cần ít nhất 8 ký tự.');
  if (registering && password !== confirmation) throw new Error('Hai mật khẩu chưa khớp.');
  return { email: normalizedEmail, password };
}
export function authErrorMessage(error) {
  const known = {
    invalid_credentials: 'Email hoặc mật khẩu chưa đúng.',
    email_not_confirmed: 'Bạn cần xác nhận email trước khi đăng nhập. Kiểm tra cả thư mục Spam.',
    user_already_exists: 'Email này đã được đăng ký. Hãy đăng nhập.',
    over_email_send_rate_limit: 'Đã gửi quá nhiều email. Vui lòng đợi rồi thử lại.',
    over_request_rate_limit: 'Bạn thao tác quá nhanh. Vui lòng đợi rồi thử lại.',
    weak_password: 'Mật khẩu chưa đáp ứng yêu cầu bảo mật của dự án.',
  };
  if (known[error.code]) return known[error.code];
  if (/network|fetch/i.test(error.message || '')) return 'Không kết nối được Supabase. Kiểm tra Internet và cấu hình dự án.';
  return error.message || 'Không thực hiện được. Vui lòng thử lại.';
}
