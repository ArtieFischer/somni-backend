// Profile-related types matching the new database schema

export type SexEnum = 'male' | 'female' | 'other' | 'unspecified';

export interface ProfileSettings {
  sleep_schedule?: {
    bed: string;      // "23:30"
    wake: string;     // "07:00" 
    tz: string;       // "Europe/Warsaw"
  };
  improve_sleep_quality?: boolean;
  interested_in_lucid_dreaming?: boolean;
  _v?: number;        // Settings version for future migrations
}

export interface Profile {
  user_id: string;
  handle: string;
  username: string | null;
  sex: SexEnum;
  birth_date: string | null;  // ISO date string
  avatar_url: string | null;
  locale: string;
  dream_interpreter: string | null;  // FK to interpreters.id
  is_premium: boolean;
  onboarding_complete: boolean;
  settings: ProfileSettings;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  user_id: string;
  handle: string;
  username?: string | null;
  sex?: SexEnum;
  birth_date?: string | null;
  avatar_url?: string | null;
  locale?: string;
  dream_interpreter?: string | null;
  is_premium?: boolean;
  onboarding_complete?: boolean;
  settings?: ProfileSettings;
}

export interface ProfileUpdate {
  handle?: string;
  username?: string | null;
  sex?: SexEnum;
  birth_date?: string | null;
  avatar_url?: string | null;
  locale?: string;
  dream_interpreter?: string | null;
  is_premium?: boolean;
  onboarding_complete?: boolean;
  settings?: ProfileSettings;
}