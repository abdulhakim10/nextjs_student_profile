# Admin Dashboard — Base Structure Guide

This document explains how the base structure works and how to extend it when building new modules (e.g., salary, inventory, HR).

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Adding a New Module](#adding-a-new-module)
4. [API Services & Proxy](#api-services--proxy)
5. [State Management (Zustand)](#state-management-zustand)
6. [Forms (React Hook Form + Zod)](#forms-react-hook-form--zod)
7. [Internationalization (i18n)](#internationalization-i18n)
8. [UI Components](#ui-components)
9. [Navigation](#navigation)
10. [Authentication](#authentication)
11. [AI Integration](#ai-integration)
12. [Conventions](#conventions)

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Environment Setup

Copy the example env file and fill in the values:

```bash
cp .env.example .env.development
```

Required variables:

| Variable                             | Description                        |
| ------------------------------------ | ---------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`           | Main backend API URL               |
| `NEXT_PUBLIC_UTILITIES_API_BASE_URL` | Utilities service URL              |
| `NEXT_PUBLIC_API_VERSION`            | API version prefix (default: `v2`) |
| `NEXT_PUBLIC_DEFAULT_APP`            | App identifier (default: `eboss`)  |
| `NEXT_PUBLIC_DEFAULT_USER_TYPE`      | User type (default: `staff`)       |
| `NEXT_PUBLIC_APP_NAME`               | App title shown in UI              |
| `ANTHROPIC_API_KEY`                  | Anthropic API key (for AI chat)    |

You can also set service-specific URLs if the module has a dedicated backend:

```env
NEXT_PUBLIC_AUTH_API_BASE_URL=https://aws01.awfatech.com
NEXT_PUBLIC_ATTENDANCE_API_BASE_URL=http://localhost:20019
NEXT_PUBLIC_NOTIFICATION_API_BASE_URL=https://devapi01.awfatech.com
```

### Running the Project

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`. Auth flow starts at `/auth/appcode`.

---

## Project Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── modules/            # Protected pages (wrapped by AuthGuard)
│   │   ├── layout.tsx          # Sidebar + Header + AI Chat + CommandPalette
│   │   ├── dashboard/page.tsx  # Home page
│   │   └── <module>/page.tsx   # Your module pages go here
│   ├── api/
│   │   ├── proxy/[...path]/    # API proxy route (avoids CORS)
│   │   └── ai/chat/            # AI agentic loop (server-side)
│   └── auth/                   # Login flow (appcode → login)
│       ├── layout.tsx          # Auth layout with branding
│       ├── appcode/page.tsx    # Step 1: Organization code
│       └── login/page.tsx      # Step 2: Username & password
├── components/
│   ├── ai/                     # AI chat panel & messages
│   ├── auth/                   # AuthGuard
│   ├── layout/                 # AppSidebar, AppHeader
│   ├── providers/              # ThemeProvider, ToastProvider
│   ├── ui/                     # shadcn/ui primitives (Button, Dialog, etc.)
│   └── <module>/               # Your module-specific components
├── config/
│   ├── api.ts                  # Base URLs and buildApiUrl helpers
│   ├── constants.ts            # Storage keys, pagination, date formats
│   ├── endpoints.ts            # API endpoint builders
│   └── navigation.ts           # Sidebar navigation items
├── i18n/
│   ├── locales/en.json         # English translations
│   ├── locales/ms.json         # Malay translations
│   ├── use-translation.ts      # useTranslation() hook
│   └── provider.tsx            # I18nProvider
├── lib/
│   ├── api-client.ts           # Axios instance with auth interceptors
│   ├── auth.ts                 # Token helpers, forceLogout
│   ├── utils.ts                # cn() class name utility
│   └── ai/                     # AI subsystem (tools, prompts, state)
├── services/                   # API service functions
│   ├── auth.service.ts         # Appcode, login, logout
│   ├── ai.service.ts           # AI chat client
│   └── <module>.service.ts     # Your module services
├── stores/                     # Zustand stores
│   ├── auth.store.ts           # Auth state (appcode + login)
│   ├── ai-chat.store.ts        # AI chat panel state
│   ├── language.store.ts       # Language preference
│   ├── ui.store.ts             # UI state (sidebar, loading)
│   └── <module>.store.ts       # Your module stores
└── types/                      # TypeScript types
    ├── index.ts                # Re-exports all types
    ├── api.ts                  # ApiResponse, PaginatedData, ApiError
    ├── auth.ts                 # AppcodeData, UserData, LoginRequest
    └── <module>.ts             # Your module types
```

---

## Adding a New Module

Here is the step-by-step process for adding a new module (example: "inventory").

### 1. Define Types

Create `src/types/inventory.ts`:

```typescript
export interface InventoryItem {
	id: string;
	sid: number;
	name: string;
	quantity: number;
	category: string;
}
```

Re-export from `src/types/index.ts`:

```typescript
export * from "./api";
export * from "./auth";
export * from "./inventory"; // Add this
```

### 2. Add Endpoints

In `src/config/endpoints.ts`:

```typescript
export const API_ENDPOINTS = {
	AUTH: {
		/* ... existing */
	},
	INVENTORY: {
		LIST: `/api/${v}/inventory/list`,
		DETAIL: (id: string) => `/api/${v}/inventory/${id}`,
		CREATE: `/api/${v}/inventory/create`,
		UPDATE: (id: string) => `/api/${v}/inventory/${id}/update`,
		DELETE: (id: string) => `/api/${v}/inventory/${id}/delete`,
	},
} as const;
```

### 3. Create a Service

Create `src/services/inventory.service.ts`:

```typescript
import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/config/endpoints";
import type { ApiResponse, PaginatedData, InventoryItem } from "@/types";

export const inventoryService = {
	getList: async (page = 1, pageSize = 20) => {
		const response = await apiClient.get<ApiResponse<PaginatedData<InventoryItem>>>(
			API_ENDPOINTS.INVENTORY.LIST,
			{ params: { page, page_size: pageSize } }
		);
		return response.data;
	},

	getDetail: async (id: string) => {
		const response = await apiClient.get<ApiResponse<InventoryItem>>(
			API_ENDPOINTS.INVENTORY.DETAIL(id)
		);
		return response.data;
	},

	create: async (data: Partial<InventoryItem>) => {
		const response = await apiClient.post<ApiResponse<InventoryItem>>(
			API_ENDPOINTS.INVENTORY.CREATE,
			data
		);
		return response.data;
	},
};
```

**Key points:**

- Always use `apiClient` — it auto-attaches auth headers and handles 401 responses.
- The base URL points to `/api/proxy`, which forwards to the actual backend.
- Type your responses with `ApiResponse<T>` for consistent structure.

### 4. Create a Store (if needed)

Create `src/stores/inventory.store.ts`:

```typescript
import { create } from "zustand";
import type { InventoryItem } from "@/types";

interface InventoryState {
	items: InventoryItem[];
	selectedItem: InventoryItem | null;
	isLoading: boolean;
	setItems: (items: InventoryItem[]) => void;
	setSelectedItem: (item: InventoryItem | null) => void;
	setLoading: (loading: boolean) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
	items: [],
	selectedItem: null,
	isLoading: false,
	setItems: (items) => set({ items }),
	setSelectedItem: (selectedItem) => set({ selectedItem }),
	setLoading: (isLoading) => set({ isLoading }),
}));
```

Use `persist` middleware only if the data needs to survive page refreshes:

```typescript
import { persist, createJSONStorage } from "zustand/middleware";

export const useInventoryStore = create<InventoryState>()(
	persist(
		(set) => ({
			/* ... */
		}),
		{
			name: "inventory-storage",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				/* only persist what's needed */
			}),
		}
	)
);
```

### 5. Create the Page

Create `src/app/modules/inventory/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n";
import { inventoryService } from "@/services/inventory.service";
import type { InventoryItem } from "@/types";

export default function InventoryPage() {
	const { t } = useTranslation("inventory");
	const [items, setItems] = useState<InventoryItem[]>([]);

	useEffect(() => {
		inventoryService.getList().then((res) => {
			if (res.success) setItems(res.data.items);
		});
	}, []);

	return (
		<div className="space-y-6">
			<h1 className="text-xl font-bold tracking-tight">{t("title")}</h1>
			{/* Your content */}
		</div>
	);
}
```

All pages under `src/app/modules/` are automatically wrapped by:

- `AuthGuard` — redirects unauthenticated users
- `AppSidebar` + `AppHeader` — layout chrome
- `AIChatPanel` + `CommandPalette` — AI and command palette

### 6. Add Navigation

In `src/config/navigation.ts`:

```typescript
import { LayoutDashboard, Package, type LucideIcon } from "lucide-react";

export const NAV_ITEMS: NavItem[] = [
	{
		titleKey: "dashboard",
		href: "/dashboard",
		icon: LayoutDashboard,
	},
	{
		titleKey: "inventory", // matches key in i18n navigation namespace
		href: "/inventory",
		icon: Package,
		children: [
			// optional sub-items
			{ titleKey: "inventoryList", href: "/inventory" },
			{ titleKey: "inventoryCategories", href: "/inventory/categories" },
		],
	},
];
```

### 7. Add Translations

In `src/i18n/locales/en.json`, add your namespace and navigation keys:

```json
{
	"navigation": {
		"dashboard": "Dashboard",
		"inventory": "Inventory",
		"inventoryList": "Item List",
		"inventoryCategories": "Categories"
	},
	"inventory": {
		"title": "Inventory",
		"addItem": "Add Item"
	}
}
```

Do the same for `ms.json` (Malay).

---

## API Services & Proxy

### How the Proxy Works

Client-side code never calls backend APIs directly. Instead:

```
Browser → /api/proxy/api/v2/inventory/list → Backend (devapi02.awfatech.com)
```

The proxy route at `src/app/api/proxy/[...path]/route.ts` determines which backend server to forward to based on the URL path:

| Path pattern                                   | Backend              | Env variable                            |
| ---------------------------------------------- | -------------------- | --------------------------------------- |
| `api/v2/auth/appcode`, `api/v2/auth/.../login` | Auth server          | `NEXT_PUBLIC_AUTH_API_BASE_URL`         |
| `api/v2/attendance/...`                        | Attendance service   | `NEXT_PUBLIC_ATTENDANCE_API_BASE_URL`   |
| `api/v2/utilities/...`                         | Utilities service    | `NEXT_PUBLIC_UTILITIES_API_BASE_URL`    |
| `api/v2/notification/...`                      | Notification service | `NEXT_PUBLIC_NOTIFICATION_API_BASE_URL` |
| Everything else                                | Default API          | `NEXT_PUBLIC_API_BASE_URL`              |

### Adding a New Backend Service

If your module has its own backend server, add a new path matcher in the proxy route:

```typescript
// In src/app/api/proxy/[...path]/route.ts

const INVENTORY_BASE_URL = process.env.NEXT_PUBLIC_INVENTORY_API_BASE_URL || API_BASE_URL;

function isInventoryPath(path: string): boolean {
	const normalized = path.replace(/^\/+/, "");
	if (!normalized.startsWith("api/")) return false;
	return normalized.slice(4).startsWith("v2/inventory/");
}
```

Then add it to the `proxyRequest` function's base URL resolution:

```typescript
const baseUrl = isAuthPath(path)
	? AUTH_BASE_URL
	: isAttendancePath(path)
	? ATTENDANCE_BASE_URL
	: isInventoryPath(path)
	? INVENTORY_BASE_URL // Add here
	: API_BASE_URL;
```

### Auth Headers

The `apiClient` (Axios) automatically attaches these headers via its request interceptor:

| Header             | Source                             | Purpose                     |
| ------------------ | ---------------------------------- | --------------------------- |
| `Authorization`    | `Bearer <access_token>`            | User authentication         |
| `x-encrypted-key`  | `encrypted_key` from localStorage  | Organization encryption key |
| `x-encrypted-user` | `encrypted_user` from localStorage | Encrypted user payload      |

The proxy forwards all three headers to the backend.

### API Response Types

All backend responses follow the `ApiResponse<T>` shape:

```typescript
interface ApiResponse<T = unknown> {
	success: boolean;
	message: string;
	data: T;
}

// For paginated lists:
interface PaginatedData<T> {
	items: T[];
	pagination: {
		current_page: number;
		page_size: number;
		total_items: number;
		total_pages: number;
	};
}
```

---

## State Management (Zustand)

The project uses [Zustand](https://zustand-demo.pmnd.rs/) for all state management.

### Existing Stores

| Store              | File                       | Purpose                                 |
| ------------------ | -------------------------- | --------------------------------------- |
| `useAuthStore`     | `stores/auth.store.ts`     | Auth state (appcode + login data)       |
| `useAIChatStore`   | `stores/ai-chat.store.ts`  | AI chat panel state (messages, actions) |
| `useLanguageStore` | `stores/language.store.ts` | Language preference (persisted)         |
| `useUIStore`       | `stores/ui.store.ts`       | UI state (sidebar, global loading)      |

### Pattern

```typescript
import { create } from "zustand";

interface MyState {
	items: Item[];
	isLoading: boolean;
	setItems: (items: Item[]) => void;
	setLoading: (loading: boolean) => void;
}

export const useMyStore = create<MyState>((set) => ({
	items: [],
	isLoading: false,
	setItems: (items) => set({ items }),
	setLoading: (isLoading) => set({ isLoading }),
}));
```

### Usage in Components

```typescript
const { items, isLoading, setItems } = useMyStore();
```

---

## Forms (React Hook Form + Zod)

Use React Hook Form with Zod schemas for validation.

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
	name: z.string().min(1, "Name is required"),
	quantity: z.number().min(0),
});

type FormData = z.infer<typeof schema>;

function MyForm() {
	const form = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: { name: "", quantity: 0 },
	});

	const onSubmit = (data: FormData) => {
		// Call your service
	};

	return (
		<form onSubmit={form.handleSubmit(onSubmit)}>
			<input {...form.register("name")} />
			{form.formState.errors.name && <span>{form.formState.errors.name.message}</span>}
			<Button type="submit">Save</Button>
		</form>
	);
}
```

---

## Internationalization (i18n)

The project supports English (`en`) and Malay (`ms`).

### Adding Translations

1. Add keys to `src/i18n/locales/en.json` and `src/i18n/locales/ms.json`:

```json
{
	"inventory": {
		"title": "Inventory",
		"addItem": "Add Item",
		"deleteConfirm": "Are you sure?"
	}
}
```

2. Use the `useTranslation` hook:

```typescript
import { useTranslation } from "@/i18n";

function MyComponent() {
	const { t } = useTranslation("inventory");
	return <h1>{t("title")}</h1>;
}

// Multiple namespaces:
const { t: tCommon } = useTranslation("common");
const { t: tInventory } = useTranslation("inventory");
```

3. Access the current locale:

```typescript
const { locale } = useTranslation("common");
// 'en' or 'ms'
```

Language preference is persisted via `useLanguageStore`.

---

## UI Components

The project uses [shadcn/ui](https://ui.shadcn.com/) components built on Radix primitives.

### Available Components

Located in `src/components/ui/`:

- `Button` / `ButtonWithTooltip` — buttons with variants and optional tooltip
- `Dialog` — modal dialogs
- `Sidebar` — app sidebar primitives
- `Tooltip` — hover tooltips
- `Command` — command palette (cmdk)
- And other shadcn/ui components

### Button Variants

```typescript
import { Button, ButtonWithTooltip } from '@/components/ui/button';

// Standard variants: default, destructive, outline, secondary, ghost, link
<Button variant="outline" size="sm">Click</Button>

// Sizes: default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg
<Button variant="ghost" size="icon">
  <TrashIcon />
</Button>

// Button with tooltip (wraps in Tooltip automatically):
<ButtonWithTooltip tooltip="Delete item" variant="ghost" size="icon">
  <TrashIcon />
</ButtonWithTooltip>
```

### Class Name Utility

Use `cn()` for conditional class names:

```typescript
import { cn } from "@/lib/utils";

<div className={cn("base-class", isActive && "active-class")} />;
```

### Toast Notifications

Use Sonner for toasts:

```typescript
import { toast } from "sonner";

toast.success("Item created");
toast.error("Something went wrong");
```

---

## Navigation

### Sidebar Navigation

Navigation items are defined in `src/config/navigation.ts`:

```typescript
export interface NavItem {
	titleKey: NavigationKey; // Key in i18n "navigation" namespace
	href: string;
	icon: LucideIcon;
	children?: NavChild[]; // Optional nested items
}

export const NAV_ITEMS: NavItem[] = [
	{ titleKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
];
```

The sidebar (`src/components/layout/app-sidebar.tsx`) renders these items with:

- Active state detection based on current pathname
- Collapsible children groups
- Icons from [Lucide](https://lucide.dev/)

### Command Palette

The command palette (`Ctrl+K` / `Cmd+K`) auto-reads `NAV_ITEMS` to provide navigation search. No extra configuration needed when you add items to `NAV_ITEMS`.

### Breadcrumbs

The header auto-generates breadcrumbs from the current URL pathname. No configuration needed.

---

## Authentication

### Two-Step Flow

```
/auth/appcode  →  /auth/login  →  /dashboard
   Step 1            Step 2         Protected
```

**Step 1 — Appcode:** User enters their organization code. The backend validates it and returns `encrypted_key` + `server_id`, which are stored in localStorage.

**Step 2 — Login:** User enters username/password. The backend returns `access_token` + `encrypted_user`, also stored in localStorage.

### Key Files

| File                                 | Purpose                                        |
| ------------------------------------ | ---------------------------------------------- |
| `src/stores/auth.store.ts`           | Zustand store managing auth state with persist |
| `src/lib/auth.ts`                    | Token read/write helpers, `forceLogout()`      |
| `src/lib/api-client.ts`              | Axios instance with auth header interceptor    |
| `src/services/auth.service.ts`       | API calls for appcode, login, logout           |
| `src/components/auth/auth-guard.tsx` | Route guard for protected pages                |

### AuthGuard

All pages under `src/app/modules/` are protected by `AuthGuard` (in the dashboard layout). It:

1. Waits for Zustand hydration (`_hasHydrated`) to avoid false redirects on page load
2. Checks `isAppCodeVerified` — redirects to `/auth/appcode` if false
3. Checks `isAuthenticated` — redirects to `/auth/login` if false
4. Renders children only when fully authenticated

### Logout vs Force Logout

| Action          | Trigger                   | Clears                              | Redirects to    |
| --------------- | ------------------------- | ----------------------------------- | --------------- |
| `logout()`      | User clicks "Log out"     | Login tokens only (keeps appcode)   | `/auth/login`   |
| `forceLogout()` | 401 response from any API | Everything (tokens + Zustand store) | `/auth/appcode` |

### Storage Keys

Defined in `src/config/constants.ts`:

```typescript
STORAGE_KEYS = {
	ENCRYPTED_KEY: "encrypted_key", // From appcode step
	SERVER_ID: "server_id", // From appcode step
	ACCESS_TOKEN: "access_token", // From login step
	ENCRYPTED_USER: "encrypted_user", // From login step
	FIREBASE_ID: "firebase_id", // From login step
	APPCODE_DATA: "appcode_data",
	USER_DATA: "user_data",
};
```

---

## AI Integration

The project includes a built-in AI assistant powered by Anthropic Claude.

### Architecture

```
Browser (AIChatPanel)
    ↓ fetch /api/ai/chat
Next.js API Route (src/app/api/ai/chat/route.ts)
    ↓ Anthropic SDK
Claude (tool calls ↔ backend APIs)
    ↓ response
Browser (renders message)
```

### How the Agentic Loop Works

1. User sends a message via the AI chat panel.
2. The server route builds a system prompt with current state context.
3. Claude responds — possibly requesting tool calls.
4. **Read tools** (data fetching) execute automatically in a loop.
5. **Write tools** (mutations) pause and return to the client for user confirmation.
6. After confirmation, the write tool executes and Claude continues the loop.

### Adding AI Tools for Your Module

**Step 1: Define the tool** in `src/lib/ai/tools.ts`:

```typescript
export const AI_TOOLS: Tool[] = [
	{
		name: "get_inventory_items",
		description: "Fetch inventory items with optional filters",
		input_schema: {
			type: "object" as const,
			properties: {
				sid: { type: "string", description: "Branch SID" },
				category: { type: "string", description: "Filter by category" },
			},
			required: ["sid"],
		},
	},
	{
		name: "create_inventory_item",
		description: "Create a new inventory item",
		input_schema: {
			type: "object" as const,
			properties: {
				sid: { type: "string", description: "Branch SID" },
				name: { type: "string", description: "Item name" },
				quantity: { type: "number", description: "Initial quantity" },
			},
			required: ["sid", "name", "quantity"],
		},
	},
];

// Register write tools (these require user confirmation):
export const WRITE_TOOLS = new Set<string>(["create_inventory_item"]);
```

**Step 2: Handle execution** in `src/app/api/ai/chat/route.ts`:

```typescript
async function executeTool(
	toolName: string,
	input: ToolInput,
	authHeaders: AuthHeaders
): Promise<ToolResult> {
	const headers = buildHeaders(authHeaders);
	const sid = input.sid as string;

	switch (toolName) {
		case "get_inventory_items": {
			const url = apiUrl(API_BASE_URL, `/inventory/${sid}/items`);
			return fetchBackend(url, "GET", headers);
		}
		case "create_inventory_item": {
			const url = apiUrl(API_BASE_URL, `/inventory/${sid}/items`);
			return fetchBackend(url, "POST", headers, {
				name: input.name,
				quantity: input.quantity,
			});
		}
		default:
			return { success: false, error: `Unknown tool: ${toolName}` };
	}
}
```

**Step 3: Add a description** for confirmation cards in `describeToolAction()`:

```typescript
function describeToolAction(toolName: string, input: ToolInput): string {
	if (toolName === "create_inventory_item") {
		return `Create inventory item "${input.name}" with quantity ${input.quantity}`;
	}
	return `Execute ${toolName}`;
}
```

**Step 4: Update the system prompt** in `src/lib/ai/system-prompt.ts` to give Claude context about available tools and data.

**Step 5: Update the state fetcher** in `src/lib/ai/state-fetcher.ts` if Claude needs to know about current system state (e.g., existing categories, inventory counts) to answer questions without calling tools.

### Key AI Files

| File                                     | Purpose                                      |
| ---------------------------------------- | -------------------------------------------- |
| `src/lib/ai/tools.ts`                    | Tool definitions + WRITE_TOOLS set           |
| `src/app/api/ai/chat/route.ts`           | Agentic loop, tool execution                 |
| `src/lib/ai/system-prompt.ts`            | System prompt builder                        |
| `src/lib/ai/state-fetcher.ts`            | Pre-fetch system state for context           |
| `src/lib/ai/constants.ts`                | Shared URLs and helpers                      |
| `src/services/ai.service.ts`             | Client-side chat API (uses fetch, not Axios) |
| `src/stores/ai-chat.store.ts`            | Chat panel UI state                          |
| `src/components/ai/ai-chat-panel.tsx`    | Chat dialog UI                               |
| `src/components/ai/ai-chat-messages.tsx` | Message rendering                            |

---

## Conventions

### File Naming

- **Pages:** `src/app/modules/<module>/page.tsx`
- **Components:** `src/components/<module>/<component-name>.tsx` — kebab-case
- **Services:** `src/services/<module>.service.ts`
- **Stores:** `src/stores/<module>.store.ts`
- **Types:** `src/types/<module>.ts`

### Import Aliases

The `@/` alias maps to `src/` (configured in `tsconfig.json`):

```typescript
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import type { InventoryItem } from "@/types";
```

### TypeScript

- Define all types in `src/types/` and re-export from `src/types/index.ts`.
- Use `ApiResponse<T>` for all service return types.
- Use `interface` for object shapes, `type` for unions/intersections.

### Component Pattern

- All dashboard pages are client components (`'use client'`).
- Keep pages thin — delegate logic to components, services, and stores.
- Use `useTranslation()` for all user-facing text.

### API Pattern

- Services call `apiClient` (Axios). Never use `fetch()` directly for backend APIs.
- Exception: the AI service uses `fetch()` because it calls a Next.js API route, not the proxy.
- Endpoints are defined in `src/config/endpoints.ts`. Never hardcode paths in services.

### Constants

Centralized in `src/config/constants.ts`:

```typescript
PAGINATION.DEFAULT_PAGE_SIZE; // 20
DATE_FORMATS.API; // 'yyyy-MM-dd'
DATE_FORMATS.DISPLAY; // 'dd MMM yyyy'
```
