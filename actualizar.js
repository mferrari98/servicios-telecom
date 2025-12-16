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
    { name: 'cont-nginx', url: 'https://github.com/mferrari98/cont-nginx.git' }
];

const rootDir = process.cwd();

// Función para colorear texto
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function colorText(color, text) {
    return colors[color] + text + colors.reset;
}

// Función para verificar el estado de un repositorio
function checkRepoStatus(repo, isMainRepo = false) {
    const repoPath = isMainRepo ? rootDir : path.join(rootDir, repo.name);

    if (!isMainRepo && !fs.existsSync(repoPath)) {
        return {
            name: repo.name,
            status: 'not_found',
            message: colorText('red', '❌ No encontrado'),
            needsUpdate: false,
            hasLocalChanges: false
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
                needsUpdate: false,
                hasLocalChanges: false
            };
        }

        // Verificar si hay cambios locales
        let hasLocalChanges = false;
        try {
            const status = execSync('git status --porcelain',
                { cwd: repoPath, encoding: 'utf8' }).trim();
            hasLocalChanges = status.length > 0;
        } catch (error) {
            // Ignorar errores en git status
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
        let commitInfo = 'Sin info';
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
                behindCommits = 'desconocido';
            }
        } else if (remoteCommit) {
            status = colorText('green', '✅ Actualizado');
        } else {
            status = colorText('red', '❌ Error obteniendo estado');
        }

        return {
            name: isMainRepo ? 'servicios-telecom (raíz)' : repo.name,
            status: needsUpdate ? 'needs_update' : 'up_to_date',
            message: status,
            needsUpdate,
            hasLocalChanges,
            info: {
                commit: commitInfo,
                branch: currentBranch,
                behind: behindCommits
            }
        };
    } catch (error) {
        return {
            name: isMainRepo ? 'servicios-telecom (raíz)' : repo.name,
            status: 'error',
            message: colorText('red', `❌ Error: ${error.message}`),
            needsUpdate: false,
            hasLocalChanges: false
        };
    }
}

// Función para hacer stash si hay cambios locales
function handleLocalChanges(repoPath) {
    try {
        const status = execSync('git status --porcelain',
            { cwd: repoPath, encoding: 'utf8' }).trim();
        if (status) {
            console.log(colorText('yellow', '   📦 Haciendo stash de cambios locales...'));
            execSync('git stash push -m "Auto-stash antes de actualizar"',
                { cwd: repoPath, stdio: 'inherit' });
            return true;
        }
    } catch (error) {
        // Ignorar errores de stash
    }
    return false;
}

// Función para restaurar cambios del stash
function restoreStash(repoPath) {
    try {
        execSync('git stash pop', { cwd: repoPath, stdio: 'inherit' });
        console.log(colorText('green', '   📦 Cambios locales restaurados'));
    } catch (error) {
        console.log(colorText('yellow', '   ⚠️ No se pudieron restaurar los cambios del stash'));
    }
}

// Función para preguntar al usuario
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
async function updateRepo(repo, isMainRepo = false) {
    const repoPath = isMainRepo ? rootDir : path.join(rootDir, repo.name);

    try {
        console.log(colorText('blue', `Actualizando ${isMainRepo ? 'servicios-telecom' : repo.name}...`));

        // Hacer stash si hay cambios locales
        const hadStash = handleLocalChanges(repoPath);

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

        // Restaurar stash si había
        if (hadStash) {
            restoreStash(repoPath);
        }

        console.log(colorText('green', `   ✅ ${isMainRepo ? 'servicios-telecom' : repo.name} actualizado`));
        return true;
    } catch (error) {
        console.error(colorText('red', `   ❌ Error actualizando ${isMainRepo ? 'servicios-telecom' : repo.name}: ${error.message}`));
        return false;
    }
}

// Función principal
async function main() {
    console.log(colorText('blue', '🔍 Verificando estado de los repositorios...\n'));

    // Verificar repositorios externos
    const results = REPOS.map(repo => checkRepoStatus(repo));

    // Verificar repositorio principal (servicios-telecom)
    const mainRepoResult = checkRepoStatus({}, true);

    // Mostrar resultados
    const updateableRepos = [];
    const localChangeRepos = [];

    // Mostrar repositorio principal
    console.log(`${colorText('cyan', '📁')} ${mainRepoResult.name}: ${mainRepoResult.message}`);
    if (mainRepoResult.hasLocalChanges) {
        console.log(`   ${colorText('yellow', '⚠️ Hay cambios locales no confirmados')}`);
        localChangeRepos.push(mainRepoResult.name);
    }
    if (mainRepoResult.needsUpdate && !mainRepoResult.hasLocalChanges) {
        updateableRepos.push(mainRepoResult);
    }
    if (mainRepoResult.info) {
        console.log(`   Último commit: ${mainRepoResult.info.commit}`);
        console.log(`   Rama actual: ${mainRepoResult.info.branch}`);
        if (mainRepoResult.needsUpdate && mainRepoResult.info.behind !== 'desconocido' && mainRepoResult.info.behind > 0) {
            console.log(`   Commits detrás: ${mainRepoResult.info.behind}`);
        }
    }
    console.log();

    // Mostrar repositorios externos
    for (const result of results) {
        console.log(`${colorText('magenta', '📦')} ${result.name}: ${result.message}`);

        if (result.hasLocalChanges) {
            console.log(`   ${colorText('yellow', '⚠️ Hay cambios locales no confirmados')}`);
            localChangeRepos.push(result.name);
        }

        if (result.needsUpdate && !result.hasLocalChanges) {
            updateableRepos.push(result);
        }

        if (result.info) {
            console.log(`   Último commit: ${result.info.commit}`);
            console.log(`   Rama actual: ${result.info.branch}`);
            if (result.needsUpdate && result.info.behind !== 'desconocido' && result.info.behind > 0) {
                console.log(`   Commits detrás: ${result.info.behind}`);
            }
        }
        console.log();
    }

    // Si hay repositorios con cambios locales
    if (localChangeRepos.length > 0) {
        console.log(colorText('yellow', `⚠️ Hay repositorios con cambios locales no confirmados:`));
        localChangeRepos.forEach(repo => console.log(`   - ${repo}`));
        console.log(colorText('cyan', '💡 Se hará stash automático de estos cambios antes de actualizar\n'));
    }

    // Si hay actualizaciones disponibles
    if (updateableRepos.length > 0) {
        console.log(colorText('yellow', `🔄 Hay actualizaciones disponibles para:`));
        updateableRepos.forEach(repo => {
            console.log(`   - ${repo.name}`);
        });

        const answer = await askQuestion('\n¿Deseas actualizar estos repositorios? (s/N): ');

        if (answer.toLowerCase() === 's') {
            console.log(colorText('blue', '\n🔄 Actualizando repositorios...\n'));

            // Actualizar repositorio principal primero
            if (updateableRepos.some(r => r.name === 'servicios-telecom (raíz)')) {
                await updateRepo({}, true);
            }

            // Actualizar repositorios externos que necesitan actualización
            for (const repoResult of updateableRepos) {
                if (repoResult.name !== 'servicios-telecom (raíz)') {
                    const repo = REPOS.find(r => r.name === repoResult.name);
                    await updateRepo(repo);
                }
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