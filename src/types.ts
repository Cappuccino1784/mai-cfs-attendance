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
  present: 0 | 1 | boolean;
}

export interface Hangout {
  id: number;
  date: string; // YYYY-MM-DD
  label: string | null;
  created_at: string;
  photo_url: string | null;
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
