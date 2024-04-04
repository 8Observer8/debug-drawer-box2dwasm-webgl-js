export let gl = null;

export function initWebGLContext(canvasName) {
    const canvas = document.getElementById(canvasName);
    if (canvas === null) {
        console.log(`Failed to get a canvas element with the name "${canvasName}"`);
        return false;
    }
    gl = canvas.getContext("webgl", { alpha: false, premultipliedAlpha: false });
    return true;
}
