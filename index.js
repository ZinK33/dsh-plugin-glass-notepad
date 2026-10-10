/**
 * Host half of the liquid-glass schedule bundle.
 *
 * The whole feature lives in the browser: entries, categories, geometry and
 * time-range annotations are client-local, so the Host registers no service,
 * tool, route or session event. This module exists only so the Loader row has a
 * host half and the Client half is composed from `dsh.client`.
 */
export function apply() {}
