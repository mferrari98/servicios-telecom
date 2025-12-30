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

function getDefaultRemoteRef(repoPath, remote = 'origin') {
    try {
        const headRef = execSync(`git symbolic-ref refs/remotes/${remote}/HEAD`, { cwd: repoPath, encoding: 'utf8' }).trim();
        const prefix = `refs/remotes/${remote}/`;
        if (headRef.startsWith(prefix)) {
            return `${remote}/${headRef.slice(prefix.length)}`;
        }
    } catch {
        // Ignore and fall back
    }

    return null;
}

function getUpstreamRef(repoPath) {
    try {
        return execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', { cwd: repoPath, encoding: 'utf8' }).trim();
    } catch {
        const defaultRemoteRef = getDefaultRemoteRef(repoPath);
        if (defaultRemoteRef) {
            return defaultRemoteRef;
        }

        const fallbacks = ['origin/main', 'origin/master'];
        for (const ref of fallbacks) {
            try {
                execSync(`git rev-parse --verify ${ref}`, { cwd: repoPath, stdio: 'ignore' });
                return ref;
            } catch {
                // Ignore and continue to next fallback
            }
        }
        return null;
    }
}

function parseRemoteBranch(upstreamRef) {
    if (!upstreamRef || !upstreamRef.includes('/')) {
        return null;
    }

    const [remote, ...branchParts] = upstreamRef.split('/');
    if (!remote || branchParts.length === 0) {
        return null;
    }

    return { remote, branch: branchParts.join('/') };
}

function getAheadBehind(repoPath, upstreamRef) {
    if (!upstreamRef) {
        return null;
    }

    try {
        const counts = execSync(`git rev-list --left-right --count ${upstreamRef}...HEAD`, { cwd: repoPath, encoding: 'utf8' }).trim();
        const [behind, ahead] = counts.split(/\s+/).map(num => parseInt(num, 10) || 0);
        return { ahead, behind };
    } catch {
        return null;
    }
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

        const upstreamRef = getUpstreamRef(repoPath);
        const trackingInfo = parseRemoteBranch(upstreamRef);

        // Obtener información del repo
        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD',
            { cwd: repoPath, encoding: 'utf8' }).trim();
        const localCommit = execSync('git rev-parse HEAD',
            { cwd: repoPath, encoding: 'utf8' }).trim();

        // Fetch para obtener info del remoto
        let fetchError = null;
        if (trackingInfo) {
            try {
                execSync(`git fetch ${trackingInfo.remote} ${trackingInfo.branch}`, { cwd: repoPath, stdio: 'ignore' });
            } catch (error) {
                fetchError = error;
            }
        } else {
            fetchError = new Error('Sin upstream configurado');
        }

        let remoteCommit = null;
        if (upstreamRef && !fetchError) {
            try {
                remoteCommit = execSync(`git rev-parse ${upstreamRef}`,
                    { cwd: repoPath, encoding: 'utf8' }).trim();
            } catch {
                remoteCommit = null;
            }
        }

        const aheadBehind = getAheadBehind(repoPath, upstreamRef);

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
        let behindCommits = aheadBehind?.behind ?? 0;
        let aheadCommits = aheadBehind?.ahead ?? 0;

        if (aheadBehind && aheadBehind.ahead > 0 && aheadBehind.behind > 0) {
            needsUpdate = true;
            status = colorText('magenta', '⚠️ Rama divergente (merge requerido)');
        } else if (aheadBehind && aheadBehind.behind > 0) {
            needsUpdate = true;
            status = colorText('yellow', '🔄 Actualización disponible');
        } else if (aheadBehind && aheadBehind.ahead > 0) {
            status = colorText('yellow', '⬆️ Commits locales pendientes de push');
        } else if (remoteCommit) {
            status = colorText('green', '✅ Actualizado');
        } else if (fetchError) {
            const level = fetchError.message && fetchError.message.includes('Sin upstream') ? 'yellow' : 'red';
            status = colorText(level, `⚠️ ${fetchError.message || fetchError}`);
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
                behind: behindCommits,
                ahead: aheadCommits,
                upstream: upstreamRef || 'sin-upstream'
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

// Manejo de cambios locales (stash) antes de actualizar
function handleLocalChanges(repoPath) {
    try {
        const status = execSync('git status --porcelain', { cwd: repoPath, encoding: 'utf8' }).trim();
        if (!status) return null;

        const before = execSync('git stash list', { cwd: repoPath, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
        const repoName = path.basename(repoPath).replace(/[^a-z0-9_-]/gi, '');
        const stashMessage = `auto-stash(servicios-telecom):${repoName}:${new Date().toISOString()}`;

        // Include untracked files to avoid pull failures
        execSync(`git stash push -u -m "${stashMessage}"`, { cwd: repoPath, stdio: 'ignore' });

        const after = execSync('git stash list', { cwd: repoPath, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
        const created = after.find(line => !before.includes(line) && line.includes(stashMessage));

        if (created) {
            return created.split(':')[0]; // e.g. stash@{0}
        }

        // Fallback: best-effort pop latest stash
        return 'stash@{0}';
    } catch {
        return null;
    }
}

function restoreStash(repoPath, stashRef) {
    if (!stashRef) return;

    try {
        execSync(`git stash pop ${stashRef}`, { cwd: repoPath, stdio: 'inherit' });
    } catch (error) {
        console.error(colorText('yellow', `   ⚠️ No se pudo aplicar el stash (${stashRef}). Puede haber conflictos.`));
        console.error(colorText('yellow', `   💡 Revisa con: git stash list && git stash show -p ${stashRef}`));
    }
}

// Función para actualizar un repositorio
async function updateRepo(repo, isMainRepo = false) {
    const repoPath = isMainRepo ? rootDir : path.join(rootDir, repo.name);

    try {
        console.log(colorText('blue', `Actualizando ${isMainRepo ? 'servicios-telecom' : repo.name}...`));

        // Hacer stash si hay cambios locales
        const stashRef = handleLocalChanges(repoPath);

        const upstreamRef = getUpstreamRef(repoPath);
        if (!upstreamRef) {
            throw new Error('No se detectó upstream ni rama remota por defecto');
        }

        const remoteInfo = parseRemoteBranch(upstreamRef);
        if (!remoteInfo) {
            throw new Error(`No se pudo interpretar upstream (${upstreamRef})`);
        }

        const fallbackRemote = remoteInfo.remote;
        const fallbackBranch = remoteInfo.branch;
        console.log(colorText('blue', `   Usando ${fallbackRemote}/${fallbackBranch}`));

        try {
            execSync(`git fetch ${fallbackRemote} ${fallbackBranch}`, { cwd: repoPath, stdio: 'inherit' });
        } catch (error) {
            throw new Error(`No se pudo hacer fetch de ${fallbackRemote}/${fallbackBranch}: ${error.message}`);
        }

        // Actualizar
        try {
            execSync(`git pull ${fallbackRemote} ${fallbackBranch}`, { cwd: repoPath, stdio: 'inherit' });
        } catch (error) {
            throw new Error(`No se pudo hacer pull de ${fallbackRemote}/${fallbackBranch}: ${error.message}`);
        }

        // Restaurar stash si había
        if (stashRef) {
            restoreStash(repoPath, stashRef);
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
    const localChangesText = mainRepoResult.hasLocalChanges ? ` ${colorText('yellow', '⚠️ Hay cambios locales')}` : '';
    console.log(`${colorText('cyan', '📁')} ${mainRepoResult.name}: ${mainRepoResult.message}${localChangesText}`);
    if (mainRepoResult.hasLocalChanges) {
        localChangeRepos.push(mainRepoResult.name);
    }
    if (mainRepoResult.needsUpdate) {
        updateableRepos.push(mainRepoResult);
    }
    if (mainRepoResult.info) {
        console.log(`   Último commit: ${mainRepoResult.info.commit}`);
        if (mainRepoResult.needsUpdate && mainRepoResult.info.behind > 0) {
            console.log(`   Commits detrás: ${mainRepoResult.info.behind}`);
        }
        if (mainRepoResult.info.ahead > 0) {
            console.log(`   Commits delante: ${mainRepoResult.info.ahead}`);
        }
    }
    console.log();

    // Mostrar repositorios externos
    for (const result of results) {
        const localChangesText = result.hasLocalChanges ? ` ${colorText('yellow', '⚠️ Hay cambios locales')}` : '';
        console.log(`${colorText('magenta', '📦')} ${result.name}: ${result.message}${localChangesText}`);

        if (result.hasLocalChanges) {
            localChangeRepos.push(result.name);
        }

        if (result.needsUpdate) {
            updateableRepos.push(result);
        }

        if (result.info) {
            console.log(`   Último commit: ${result.info.commit}`);
            if (result.needsUpdate && result.info.behind > 0) {
                console.log(`   Commits detrás: ${result.info.behind}`);
            }
            if (result.info.ahead > 0) {
                console.log(`   Commits delante: ${result.info.ahead}`);
            }
        }
        console.log();
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