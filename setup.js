#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuración
const REPOS = [
    { name: 'cont-portal', url: 'https://github.com/mferrari98/cont-portal.git' },
    { name: 'cont-guardias', url: 'https://github.com/mferrari98/cont-guardias.git' },
    { name: 'cont-empa', url: 'https://github.com/mferrari98/cont-empa.git' },
    { name: 'cont-reportespiolis', url: 'https://github.com/mferrari98/cont-reportespiolis.git' },
    { name: 'cont-monitor-recursos', url: 'https://github.com/mferrari98/cont-monitor-recursos.git' },
    { name: 'cont-nginx', url: 'https://github.com/mferrari98/cont-nginx.git' }
];

const rootDir = process.cwd();

// Función para colorear texto (versión simple)
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function colorText(color, text) {
    return colors[color] + text + colors.reset;
}

// Función para verificar si estamos en el directorio correcto
function checkDirectory() {
    const composeFile = path.join(rootDir, 'docker-compose.yml');
    if (!fs.existsSync(composeFile)) {
        console.error(colorText('red', '❌ Error: Ejecuta este script desde el directorio servicios-telecom'));
        process.exit(1);
    }
}

// Función para clonar un repositorio
function cloneRepo(repo) {
    const repoPath = path.join(rootDir, repo.name);

    if (fs.existsSync(repoPath)) {
        console.log(colorText('green', `✅ ${repo.name} ya existe`));
        return true;
    }

    console.log(colorText('blue', `📥 Clonando ${repo.name}...`));
    try {
        execSync(`git clone ${repo.url}`, { cwd: rootDir, stdio: 'inherit' });
        console.log(colorText('green', `✅ ${repo.name} clonado correctamente`));
        return true;
    } catch (error) {
        console.error(colorText('red', `❌ Error clonando ${repo.name}: ${error.message}`));
        return false;
    }
}

// Función para configurar archivos .env
function setupEnvFiles() {
    console.log(colorText('yellow', '⚙️ Configurando variables de entorno...'));

    // Configurar .env para cont-guardias
    const guardiasEnvPath = path.join(rootDir, 'cont-guardias', '.env');
    const guardiasEnvExamplePath = path.join(rootDir, 'cont-guardias', '.env.example');

    if (fs.existsSync(guardiasEnvExamplePath)) {
        if (!fs.existsSync(guardiasEnvPath)) {
            fs.copyFileSync(guardiasEnvExamplePath, guardiasEnvPath);
            console.log(colorText('green', '✅ Archivo .env creado en cont-guardias'));
        } else {
            console.log(colorText('green', '✅ El archivo .env ya existe en cont-guardias'));
        }
    } else {
        console.log(colorText('yellow', '⚠️ Advertencia: No se encontró .env.example en cont-guardias'));
    }
}

// Función para verificar el estado final
function showSummary() {
    console.log('\n📝 Resumen:');

    for (const repo of REPOS) {
        const repoPath = path.join(rootDir, repo.name);
        const exists = fs.existsSync(repoPath);
        console.log(`   - ${repo.name}: ${exists ? colorText('green', 'Descargado') : colorText('red', 'No encontrado')}`);
    }

    const guardiasEnvExists = fs.existsSync(path.join(rootDir, 'cont-guardias', '.env'));
    console.log(`   - .env cont-guardias: ${guardiasEnvExists ? colorText('green', 'Configurado') : colorText('red', 'No configurado')}`);
}

// Función principal
function main() {
    console.log(colorText('blue', '🚀 Configurando servicios-telecom...'));

    // Verificar directorio
    checkDirectory();

    // Clonar repositorios
    console.log('\n📥 Clonando repositorios...');
    const results = REPOS.map(repo => cloneRepo(repo));

    // Configurar archivos .env
    setupEnvFiles();

    // Mostrar resumen
    showSummary();

    // Mostrar comandos útiles
    console.log(colorText('blue', '\n🚀 Para iniciar los servicios:'));
    console.log(colorText('reset', '   docker-compose up --build -d'));

    console.log(colorText('blue', '\n📝 Comandos útiles:'));
    console.log(colorText('reset', '   Ver logs:           docker-compose logs -f'));
    console.log(colorText('reset', '   Detener servicios:  docker-compose down'));
    console.log(colorText('reset', '   Ver estado:         docker-compose ps'));

    console.log(colorText('green', '\n🎉 Configuración completada!\n'));
}

// Ejecutar
if (require.main === module) {
    main();
}