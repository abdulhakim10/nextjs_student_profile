/** GeoJSON Point for location coordinates */
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

/** Location - create request (snake_case for API) */
export interface LocationPayload {
  sid: string;
  name: string;
  address?: string | null;
  coordinates: GeoPoint;
  radius_meter: number;
  is_active: boolean;
}

/** Location - update request includes code */
export interface LocationUpdatePayload extends LocationPayload {
  code: string;
}

/** Location - list item from API (camelCase in response) */
export interface LocationItem {
  code: string;
  name: string;
  address?: string | null;
  coordinates: GeoPoint;
  radiusMeter: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Device - create/update request (snake_case for API) */
export interface DevicePayload {
  sid: string;
  device_code: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  ip_address?: string;
  is_active: boolean;
}

/** Device - update includes system code */
export interface DeviceUpdatePayload extends DevicePayload {
  code: string;
}

/** Device - list item from API */
export interface DeviceItem {
  code: string;
  deviceCode: string;
  name: string;
  status: string;
  ipAddress?: string;
  lastSeenAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Attendance setting - get response */
export interface AttendanceSettingData {
  appcode: string;
  sid: string;
  mode: 'LOCATION' | 'DEVICE';
  isActive: boolean;
  logo: string | null;
  locationCodes: string[];
  deviceCodes: string[];
  createdAt: string;
  updatedAt: string;
}

/** Update/upsert attendance setting (PUT - creates if not exists, updates if exists) */
export interface AttendanceSettingUpdatePayload {
  sid: string;
  mode: 'LOCATION' | 'DEVICE';
}
