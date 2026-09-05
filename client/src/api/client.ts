export type TitleType = 'movie' | 'series';
export type TitleStatus = 'to_watch' | 'watched';

export interface Title {
  id: number;
  name: string;
  type: TitleType;
  genre: string;
  status: TitleStatus;
  notes: string | null;
  rating_acting: number | null;
  rating_story: number | null;
  rating_tension: number | null;
  rating_pacing: number | null;
  rating_visuals: number | null;
  ai_description: string | null;
  ai_source_url: string | null;
  ai_fetched_at: string | null;
  created_at: string;
  updated_at: string;
  average_rating: number | null;
  rating_count: number;
}

export interface Friend {
  id: number;
  username: string;
}

const TOKEN_KEY = 'movie-tracker-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`/api${path}`, { ...options, headers });
  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error || 'Ein Fehler ist aufgetreten.', response.status);
  }
  return data as T;
}

export const api = {
  register: (username: string, password: string) =>
    request<{ token: string; user: { id: number; username: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  login: (username: string, password: string) =>
    request<{ token: string; user: { id: number; username: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<{ user: { id: number; username: string } }>('/auth/me'),

  listTitles: (status?: TitleStatus) =>
    request<{ titles: Title[] }>(`/titles${status ? `?status=${status}` : ''}`),
  getTitle: (id: number) => request<{ title: Title }>(`/titles/${id}`),
  createTitle: (payload: { name: string; type: TitleType; genre: string; status?: TitleStatus }) =>
    request<{ title: Title }>('/titles', { method: 'POST', body: JSON.stringify(payload) }),
  updateTitle: (id: number, payload: Partial<Title>) =>
    request<{ title: Title }>(`/titles/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTitle: (id: number) => request<void>(`/titles/${id}`, { method: 'DELETE' }),
  fetchTitleInfo: (id: number, refresh = false) =>
    request<{ title: Title }>(`/titles/${id}/fetch-info${refresh ? '?refresh=true' : ''}`, {
      method: 'POST',
    }),

  listFriends: () => request<{ friends: Friend[] }>('/friends'),
  addFriend: (username: string) =>
    request<{ friend: Friend }>('/friends', { method: 'POST', body: JSON.stringify({ username }) }),
  removeFriend: (friendId: number) => request<void>(`/friends/${friendId}`, { method: 'DELETE' }),
  friendTitles: (friendId: number) =>
    request<{ friend: Friend; titles: Title[] }>(`/friends/${friendId}/titles`),
};

export const RATING_FIELDS: { key: keyof Title; label: string }[] = [
  { key: 'rating_acting', label: 'Schauspielleistung' },
  { key: 'rating_story', label: 'Story' },
  { key: 'rating_tension', label: 'Spannung / Interesse' },
  { key: 'rating_pacing', label: 'Länge / Pacing' },
  { key: 'rating_visuals', label: 'Bildgestaltung' },
];
