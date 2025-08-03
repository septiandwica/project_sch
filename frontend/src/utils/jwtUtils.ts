// utils/jwtUtils.ts
export interface UserInfo {
  id: number;
  username: string;
  role: string;
}

export interface DecodedToken {
  sub: UserInfo;
  exp: number;
  iat: number;
  // tambahan field lain dari JWT jika ada
}

// Fungsi untuk decode JWT token
export const jwtDecode = (token: string): DecodedToken | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

// Fungsi untuk mengecek apakah token expired
export const isTokenExpired = (token: string): boolean => {
  const decoded = jwtDecode(token);
  if (!decoded) return true;
  
  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
};

// Fungsi untuk mendapatkan user info dari token
export const getUserFromToken = (): UserInfo | null => {
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  
  if (isTokenExpired(token)) {
    localStorage.removeItem('access_token');
    return null;
  }
  
  const decoded = jwtDecode(token);
  return decoded?.sub || null;
};

// Fungsi untuk mengecek role user
export const hasRole = (requiredRole: string): boolean => {
  const user = getUserFromToken();
  return user?.role === requiredRole;
};

// Fungsi untuk mengecek apakah user adalah admin
export const isAdmin = (): boolean => {
  return hasRole('admin');
};

// Fungsi untuk mengecek apakah user adalah lecturer
export const isLecturer = (): boolean => {
  return hasRole('lecturer');
};

// Fungsi untuk logout (hapus token)
export const logout = (): void => {
  localStorage.removeItem('access_token');
};