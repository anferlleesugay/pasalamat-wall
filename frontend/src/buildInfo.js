// Filled in at build time by the Dockerfile (Jenkins passes the build number
// and commit). Shown in the footer so you can prove a new deploy is live.
export const BUILD_NUMBER = import.meta.env.VITE_BUILD_NUMBER || 'dev';
export const GIT_COMMIT = (import.meta.env.VITE_GIT_COMMIT || 'local').slice(0, 7);
