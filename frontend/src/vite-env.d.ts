/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_INACTIVITY_TIMEOUT_MINUTES?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
