export function getFoodPreferences(profile) {
  return {
    food_likes: profile?.food_likes || '',
    food_limits: profile?.food_limits || '',
    food_dislikes: profile?.food_dislikes || '',
  };
}

export function validateFoodPreferences(input) {
  const fields = getFoodPreferences(input);
  for (const key of Object.keys(fields)) {
    if (typeof fields[key] !== 'string' || fields[key].length > 500)
      throw new Error('Mỗi nhóm sở thích dài tối đa 500 ký tự.');
    fields[key] = fields[key].trim();
  }
  return fields;
}

export function validateProfile(input) {
  const display_name = String(input.display_name || '').trim();
  const phone = String(input.phone || '').trim();
  const bio = String(input.bio || '').trim();
  if (!display_name || display_name.length > 100)
    throw new Error('Tên hiển thị cần từ 1 đến 100 ký tự.');
  if (phone && (phone.length > 25 || !/^\+?[0-9 ()-]{7,25}$/.test(phone)))
    throw new Error('Số điện thoại chưa hợp lệ.');
  if (bio.length > 500) throw new Error('Giới thiệu tối đa 500 ký tự.');
  let date_of_birth = null;
  if (input.date_of_birth) {
    const value = String(input.date_of_birth).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Ngày sinh có định dạng yyyy-MM-dd.');
    const [y, m, d] = value.split('-').map(Number),
      date = new Date(y, m - 1, d),
      now = new Date();
    if (
      y < 1900 ||
      date.getFullYear() !== y ||
      date.getMonth() !== m - 1 ||
      date.getDate() !== d ||
      date > now
    )
      throw new Error('Ngày sinh không hợp lệ.');
    date_of_birth = value;
  }
  return { display_name, phone, bio, date_of_birth };
}
export function validatePasswordChange(current, password, confirmation) {
  if (!current) throw new Error('Nhập mật khẩu hiện tại.');
  if (password.length < 8) throw new Error('Mật khẩu mới cần ít nhất 8 ký tự.');
  if (password !== confirmation) throw new Error('Hai lần nhập mật khẩu mới chưa khớp.');
  if (password === current) throw new Error('Mật khẩu mới cần khác mật khẩu hiện tại.');
}
