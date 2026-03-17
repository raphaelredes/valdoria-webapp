// NAVIGATE AMBIENT — Now delegated to Canvas renderer
// Particles rendered via navigate-canvas-renderer.js

function initAmbientParticles() {
    // Particles now rendered by canvas renderer (_cvInitParticles)
    if (typeof _cvInitParticles === 'function') _cvInitParticles();
}

function refreshAmbientParticles() {
    initAmbientParticles();
}
