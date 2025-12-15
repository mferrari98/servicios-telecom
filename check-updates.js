#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuración
const REPOS = [
    { name: 'cont-portal', url: 'https://github.com/mferrari98/cont-portal.git' },
    { name: 'cont-guardias', url: 'https://github.com/mferrari98/cont-guardias.git' },
    { name: 'cont-nginx', url: 'https://github.com/mferrari98/cont-nginx.git' }
];

const rootDir = process.cwd();

// Función para colorear texto
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

// Función para verificar el estado de un repositorio
function checkRepoStatus(repo) {
    const repoPath = path.join(rootDir, repo.name);

    if (!fs.existsSync(repoPath)) {
        return {
            name: repo.name,
            status: 'not_found',
            message: colorText('red', '❌ No encontrado'),
            needsUpdate: false
        };
    }

    try {
        // Verificar si es un repo git
        const gitDir = path.join(repoPath, '.git');
        if (!fs.existsSync(gitDir)) {
            return {
                name: repo.name,
                status: 'not_git',
                message: colorText('yellow', '⚠️ No es un repositorio git'),
                needsUpdate: false
            };
        }

        // Obtener información del repo
        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD',
            { cwd: repoPath, encoding: 'utf8' }).trim();
        const localCommit = execSync('git rev-parse HEAD',
            { cwd: repoPath, encoding: 'utf8' }).trim();

        // Fetch para obtener info del remoto
        try {
            execSync('git fetch origin', { cwd: repoPath, stdio: 'ignore' });
        } catch (error) {
            // Ignorar errores de fetch
        }

        let remoteCommit;
        try {
            remoteCommit = execSync('git rev-parse origin/main',
                { cwd: repoPath, encoding: 'utf8' }).trim();
        } catch {
            try {
                remoteCommit = execSync('git rev-parse origin/master',
                    { cwd: repoPath, encoding: 'utf8' }).trim();
            } catch {
                remoteCommit = null;
            }
        }

        // Obtener info del último commit
        let commitInfo = 'No info';
        try {
            const latestCommit = execSync('git log -1 --oneline --pretty=format:"%h - %an, %ar"',
                { cwd: repoPath, encoding: 'utf8' }).trim();
            commitInfo = latestCommit;
        } catch (error) {
            // Ignorar errores
        }

        // Determinar si necesita actualización
        let needsUpdate = false;
        let status = '';
        let behindCommits = 0;

        if (remoteCommit && localCommit !== remoteCommit) {
            needsUpdate = true;
            status = colorText('yellow', '🔄 Actualización disponible');
            try {
                behindCommits = parseInt(execSync(`git rev-list --count HEAD..origin/main`,
                    { cwd: repoPath, encoding: 'utf8' }).trim()) ||
                                 parseInt(execSync(`git rev-list --count HEAD..origin/master`,
                    { cwd: repoPath, encoding: 'utf8' }).trim()) || 0;
            } catch {
                behindCommits = 'unknown';
            }
        } else if (remoteCommit) {
            status = colorText('green', '✅ Actualizado');
        } else {
            status = colorText('red', '❌ Error obteniendo estado');
        }

        return {
            name: repo.name,
            status: needsUpdate ? 'needs_update' : 'up_to_date',
            message: status,
            needsUpdate,
            info: {
                commit: commitInfo,
                branch: currentBranch,
                behind: behindCommits
            }
        };
    } catch (error) {
        return {
            name: repo.name,
            status: 'error',
            message: colorText('red', `❌ Error: ${error.message}`),
            needsUpdate: false
        };
    }
}

// Función para preguntar al usuario (simple)
function askQuestion(message) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(message, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

// Función para actualizar un repositorio
async function updateRepo(repo) {
    const repoPath = path.join(rootDir, repo.name);

    try {
        console.log(colorText('blue', `Actualizando ${repo.name}...`));

        // Hacer stash si hay cambios locales
        try {
            const status = execSync('git status --porcelain',
                { cwd: repoPath, encoding: 'utf8' }).trim();
            if (status) {
                console.log(colorText('yellow', '   Haciendo stash de cambios locales...'));
                execSync('git stash push -m "Auto-stash before update"',
                    { cwd: repoPath, stdio: 'inherit' });
            }
        } catch (error) {
            // Ignorar errores de stash
        }

        // Actualizar
        try {
            execSync('git pull origin main', { cwd: repoPath, stdio: 'inherit' });
        } catch {
            try {
                execSync('git pull origin master', { cwd: repoPath, stdio: 'inherit' });
            } catch (error) {
                throw error;
            }
        }

        console.log(colorText('green', `   ✅ ${repo.name} actualizado`));
        return true;
    } catch (error) {
        console.error(colorText('red', `   ❌ Error actualizando ${repo.name}: ${error.message}`));
        return false;
    }
}

// Función principal
async function main() {
    console.log(colorText('blue', '🔍 Verificando estado de los repositorios...\n'));

    // Verificar todos los repositorios
    const results = REPOS.map(repo => checkRepoStatus(repo));

    // Mostrar resultados
    const updatesNeeded = [];

    for (const result of results) {
        console.log(`${colorText('blue', '📦')} ${result.name}: ${result.message}`);

        if (result.info) {
            console.log(`   Último commit: ${result.info.commit}`);
            console.log(`   Rama actual: ${result.info.branch}`);

            if (result.needsUpdate && result.info.behind !== 'unknown' && result.info.behind > 0) {
                console.log(`   Commits detrás: ${result.info.behind}`);
            }
        }

        if (result.needsUpdate) {
            updatesNeeded.push(result.name);
        }

        console.log();
    }

    // Si hay actualizaciones disponibles
    if (updatesNeeded.length > 0) {
        console.log(colorText('yellow', `🔄 Hay actualizaciones disponibles para:`));
        updatesNeeded.forEach(repo => console.log(`   - ${repo}`));

        const answer = await askQuestion('\n¿Deseas actualizar estos repositorios? (s/N): ');

        if (answer.toLowerCase() === 's') {
            console.log(colorText('blue', '\n🔄 Actualizando repositorios...\n'));

            // Actualizar cada repo que necesita actualización
            for (const repoName of updatesNeeded) {
                const repo = REPOS.find(r => r.name === repoName);
                await updateRepo(repo);
            }

            console.log(colorText('green', '\n🎉 Actualización completada!\n'));
            console.log(colorText('blue', '💡 Recomendación:'));
            console.log(colorText('reset', '   Si actualizaste los repositorios, considera reconstruir los contenedores:'));
            console.log(colorText('reset', '   docker-compose down'));
            console.log(colorText('reset', '   docker-compose up --build -d'));
        } else {
            console.log(colorText('blue', 'No se realizaron actualizaciones'));
        }
    } else {
        console.log(colorText('green', '🎉 Todos los repositorios están actualizados'));
    }
}

// Ejecutar
if (require.main === module) {
    main().catch(error => {
        console.error(colorText('red', 'Error:'), error.message);
        process.exit(1);
    });
}