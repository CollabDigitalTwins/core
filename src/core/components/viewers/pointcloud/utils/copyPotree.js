//script to copy potree from node_modules to public/vendors

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const sourceDir = path.join(projectRoot, 'node_modules', 'potree-cdt', 'potree');
const targetDir = path.join(projectRoot, 'public', 'vendors', 'potree');

console.log('Copying Potree libraries from npm package to public/vendors...');

main();

async function main() {
    try {
     // Check if source exists
        if (!fs.existsSync(sourceDir)) {
            console.error('❌ Error: potree-cdt package not found in node_modules');
            console.error('Run: yarn add potree-cdt');
            console.log()
            process.exit(1);
        }

        // Remove old vendors folder to ensure clean copy
        if (fs.existsSync(targetDir)) {
            console.log('Removing old vendors/potree folder...');
            fs.rmSync(targetDir, { recursive: true, force: true });
        }

        // Add a small delay for safety
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Copy all files from potree-cdt/potree to public/vendors
        fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });

        // Read package version for confirmation
        const packageJsonPath = path.join(projectRoot, 'node_modules', 'potree-cdt', 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        console.log(`✅ Successfully copied Potree v${packageJson.version} to public/vendors/potree`);
        console.log(`   Source: node_modules/potree-cdt/potree`);
    } catch (error) {
        console.error('❌ Error copying Potree libraries:', error.message);
        process.exit(1);
    }
}

