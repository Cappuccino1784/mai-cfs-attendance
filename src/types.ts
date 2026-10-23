export interface Member {
  id: number;
  name: string;
  color: string;
  emoji: string;
}

export interface AttendanceRecord {
  id: number;
  hangout_id: number;
  person_name: string;
  present: 0 | 1;
}

export interface Hangout {
  id: number;
  date: string; // YYYY-MM-DD
  label: string | null;
  photo_url: string | null; // Vercel Blob public URL
  created_at: string;
  attendance: AttendanceRecord[];
}

export interface MemberStat extends Member {
  attended: number;
  total: number;
}

export interface StatsResponse {
  totalHangouts: number;
  members: MemberStat[];
}
