#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

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

function promptInput(question) {
    return new Promise(resolve => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true
        });
        rl.question(question, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

function promptHidden(question) {
    return new Promise(resolve => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true
        });
        rl._writeToOutput = function(stringToWrite) {
            if (!rl.stdoutMuted) {
                rl.output.write(stringToWrite);
            }
        };
        rl.question(question, answer => {
            rl.close();
            process.stdout.write('\n');
            resolve(answer.trim());
        });
        rl.stdoutMuted = true;
    });
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

async function setupBasicAuth() {
    if (!process.stdin.isTTY) {
        console.log(colorText('yellow', '⚠️  No se detectó TTY; se omite configuración de Basic Auth.'));
        return;
    }

    const nginxDir = path.join(rootDir, 'cont-nginx');
    if (!fs.existsSync(nginxDir)) {
        console.log(colorText('yellow', '⚠️  cont-nginx no existe; se omite configuración de Basic Auth.'));
        return;
    }

    const htpasswdPath = path.join(nginxDir, 'htpasswd');
    if (fs.existsSync(htpasswdPath)) {
        const overwrite = await promptInput('⚠️  Ya existe cont-nginx/htpasswd. ¿Sobrescribir? (s/N): ');
        if (!/^s/i.test(overwrite)) {
            console.log(colorText('yellow', '↪ Se mantiene el archivo htpasswd existente.'));
            return;
        }
    }

    const username = await promptInput('Usuario para Basic Auth de Nginx: ');
    if (!username) {
        console.log(colorText('yellow', '⚠️  Usuario vacío; se omite configuración de Basic Auth.'));
        return;
    }

    const password = await promptHidden('Clave para Basic Auth: ');
    if (!password) {
        console.log(colorText('yellow', '⚠️  Clave vacía; se omite configuración de Basic Auth.'));
        return;
    }

    const confirm = await promptHidden('Confirmar clave: ');
    if (password !== confirm) {
        console.log(colorText('red', '❌ Las claves no coinciden; se omite configuración de Basic Auth.'));
        return;
    }

    let hash;
    try {
        hash = execSync('openssl passwd -apr1 -stdin', {
            input: password,
            stdio: ['pipe', 'pipe', 'ignore']
        }).toString().trim();
    } catch (error) {
        console.error(colorText('red', '❌ Error generando hash con openssl. ¿Está instalado?'));
        return;
    }

    fs.writeFileSync(htpasswdPath, `${username}:${hash}\n`, { mode: 0o644 });
    fs.chmodSync(htpasswdPath, 0o644);
    console.log(colorText('green', '✅ Archivo htpasswd creado en cont-nginx/htpasswd'));
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

    const htpasswdExists = fs.existsSync(path.join(rootDir, 'cont-nginx', 'htpasswd'));
    console.log(`   - htpasswd Nginx: ${htpasswdExists ? colorText('green', 'Configurado') : colorText('red', 'No configurado')}`);
}

// Función principal
async function main() {
    console.log(colorText('blue', '🚀 Configurando servicios-telecom...'));

    // Verificar directorio
    checkDirectory();

    // Clonar repositorios
    console.log('\n📥 Clonando repositorios...');
    const results = REPOS.map(repo => cloneRepo(repo));

    // Configurar archivos .env
    setupEnvFiles();

    // Configurar Basic Auth de Nginx
    await setupBasicAuth();

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
    main().catch(error => {
        console.error(colorText('red', `❌ Error: ${error.message}`));
        process.exit(1);
    });
}
