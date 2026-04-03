import { API_CONFIG } from "./api";

const v = API_CONFIG.VERSION;

export const API_ENDPOINTS = {
	AUTH: {
		APPCODE: `/api/${v}/auth/appcode`,
		LOGIN: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
			`/api/${v}/auth/${app}/${user}/login`,
		LOGOUT: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
			`/api/${v}/auth/${app}/${user}/logout`,
		REFRESH_TOKEN: `/api/${v}/auth/refresh-token`,
	},
} as const;
