/**
 * Vercel Serverless Function — wraps the pre-compiled Express app.
 * The server is bundled into _compiled.mjs by esbuild during the build step.
 * All /api/* requests are routed here via vercel.json rewrites.
 */
export { default } from './_compiled.mjs';
