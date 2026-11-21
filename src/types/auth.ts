export interface AppcodeRequest {
  appcode: string;
}

export interface AppcodeData {
  encrypted_key: string;
  server_id: string;
  sid: string;
  client_appname: string;
  customer: string;
  client_logo: string;
  url: string;
  bos_config: string;
  app_config: string;
}

export interface LoginRequest {
  app_version: string;
  username: string;
  password: string;
  login_type: 'normal' | 'qr';
  firebase_id: string;
  platform_code: number;
}

export interface UserData {
  token: string;
  encrypted_user: string;
  tfa_expired: boolean;
  is_default_password: boolean;
  password_expired_in: string;
  server_id: string;
  user_id: string;
  user_sid: string;
  user_name: string;
  user_image: string;
  user_phone_num: string;
  user_ic: string;
  user_email: string;
  user_addr: string;
  sch_name: string;
  sch_addr: string;
  sch_coordinate: string;
  sch_coordinate_arr: string[];
  sch_radius: string;
  system_level: string;
  system_access: string;
  system_config: string;
  bos_config: string;
}
